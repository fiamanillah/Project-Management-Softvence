import { env } from "@workspace/env/api";
import { hashPassword } from "../../src/utils/crypto";
import { AuditLogService } from "../../src/core/audit/audit.service";
import type { SeedContext, SeedUserRef } from "./types";

export async function seedUsersAndProfiles(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const envAdminEmail = (env.ADMIN_EMAIL || env.DEFAULT_ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const envAdminPassword = env.ADMIN_PASSWORD || env.DEFAULT_ADMIN_PASSWORD || "adminpassword123";
  const envAdminPasswordHash = await hashPassword(envAdminPassword);

  const defaultPassword = "Password123!";
  const defaultPasswordHash = await hashPassword(defaultPassword);

  const USERS_DATA: {
    email: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    systemRole: "SuperAdmin" | "Admin" | "Staff";
    roleCode: string;
    desigCode: string;
    avatarUrl?: string;
    customPasswordHash?: string;
  }[] = [
    { email: "superadmin@softvence.com", employeeId: "ADM-000001", firstName: "Super", lastName: "Admin", systemRole: "SuperAdmin", roleCode: "SUPER_ADMIN", desigCode: "SUPER_ADMIN", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
    { email: "director.tech@softvence.com", employeeId: "ENG-000001", firstName: "Arthur", lastName: "Pendleton", systemRole: "Admin", roleCode: "ENG_DIRECTOR", desigCode: "ENG_DIRECTOR", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    { email: "pm.sarah@softvence.com", employeeId: "PM-000001", firstName: "Sarah", lastName: "Jenkins", systemRole: "Staff", roleCode: "PROJECT_MANAGER", desigCode: "PROJECT_MANAGER", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
    { email: "pm.david@softvence.com", employeeId: "PM-000002", firstName: "David", lastName: "Miller", systemRole: "Staff", roleCode: "PROJECT_MANAGER", desigCode: "PROJECT_MANAGER", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" },
    { email: "lead.alex@softvence.com", employeeId: "ENG-000002", firstName: "Alex", lastName: "Vance", systemRole: "Staff", roleCode: "TECH_LEAD", desigCode: "TECH_LEAD", avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150" },
    { email: "lead.elena@softvence.com", employeeId: "DES-000001", firstName: "Elena", lastName: "Rostova", systemRole: "Staff", roleCode: "LEAD_DESIGNER", desigCode: "LEAD_DESIGNER", avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" },
    { email: "dev.james@softvence.com", employeeId: "ENG-000003", firstName: "James", lastName: "Wilson", systemRole: "Staff", roleCode: "SR_DEVELOPER", desigCode: "SR_DEVELOPER", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150" },
    { email: "dev.priya@softvence.com", employeeId: "ENG-000004", firstName: "Priya", lastName: "Sharma", systemRole: "Staff", roleCode: "DEVELOPER", desigCode: "DEVELOPER", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
    { email: "dev.marcus@softvence.com", employeeId: "ENG-000005", firstName: "Marcus", lastName: "Chen", systemRole: "Staff", roleCode: "DEVELOPER", desigCode: "DEVELOPER", avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150" },
    { email: "designer.lisa@softvence.com", employeeId: "DES-000002", firstName: "Lisa", lastName: "Tanaka", systemRole: "Staff", roleCode: "DESIGNER", desigCode: "DESIGNER", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150" },
    { email: "qa.tom@softvence.com", employeeId: "QA-000001", firstName: "Tom", lastName: "Bradley", systemRole: "Staff", roleCode: "QA_LEAD", desigCode: "QA_LEAD", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" },
    { email: "qa.emily@softvence.com", employeeId: "QA-000002", firstName: "Emily", lastName: "Watson", systemRole: "Staff", roleCode: "QA_ENGINEER", desigCode: "QA_ENGINEER", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150" },
    { email: "bd.rachel@softvence.com", employeeId: "BD-000001", firstName: "Rachel", lastName: "Green", systemRole: "Staff", roleCode: "BD_MANAGER", desigCode: "BD_MANAGER", avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150" },
    { email: "bd.kevin@softvence.com", employeeId: "BD-000002", firstName: "Kevin", lastName: "Patel", systemRole: "Staff", roleCode: "BD_EXECUTIVE", desigCode: "BD_EXECUTIVE", avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150" },
    { email: "support.anna@softvence.com", employeeId: "CS-000001", firstName: "Anna", lastName: "Bell", systemRole: "Staff", roleCode: "SUPPORT_SPECIALIST", desigCode: "SUPPORT_SPECIALIST", avatarUrl: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=150" },
  ];

  // Add or update configured env admin in USERS_DATA
  const existingAdminEntry = USERS_DATA.find((u) => u.email.toLowerCase() === envAdminEmail);
  if (existingAdminEntry) {
    existingAdminEntry.systemRole = "SuperAdmin";
    existingAdminEntry.roleCode = "SUPER_ADMIN";
    existingAdminEntry.desigCode = "SUPER_ADMIN";
    existingAdminEntry.customPasswordHash = envAdminPasswordHash;
  } else {
    USERS_DATA.unshift({
      email: envAdminEmail,
      employeeId: `ADM-${Date.now().toString().slice(-6)}`,
      firstName: "System",
      lastName: "Administrator",
      systemRole: "SuperAdmin",
      roleCode: "SUPER_ADMIN",
      desigCode: "SUPER_ADMIN",
      customPasswordHash: envAdminPasswordHash,
    });
  }

  const defaultBranchId = ctx.branches.get("BET-SA")!;

  for (const u of USERS_DATA) {
    const roleId = ctx.roles.get(u.roleCode);
    const designationId = ctx.designations.get(u.desigCode);
    const userPasswordHash = u.customPasswordHash || defaultPasswordHash;

    let userRecord = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (userRecord) {
      userRecord = await prisma.user.update({
        where: { email: u.email },
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          passwordHash: userPasswordHash,
          systemRole: u.systemRole,
          branchId: defaultBranchId,
          roleId,
          designationId,
          avatarUrl: u.avatarUrl || userRecord.avatarUrl,
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
          passwordHash: userPasswordHash,
          systemRole: u.systemRole,
          branchId: defaultBranchId,
          roleId,
          designationId,
          avatarUrl: u.avatarUrl,
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

    // Dispatch audit log for SuperAdmin bootstrap
    if (u.systemRole === "SuperAdmin") {
      AuditLogService.log({
        module: "Auth",
        action: "SUPER_ADMIN_BOOTSTRAP",
        entityTable: "users",
        entityId: userRecord.id,
        actor: {
          id: userRecord.id,
          email: userRecord.email,
          role: "SuperAdmin",
        },
        metadata: {
          email: userRecord.email,
          bootstrappedAt: new Date().toISOString(),
        },
        status: "SUCCESS",
      });
    }
  }

  // 2. Assign Scoped Permissions to Roles
  const superAdminUser = ctx.users.get(envAdminEmail) || ctx.users.get("superadmin@softvence.com")!;
  const globalScopeId = ctx.scopeTypes.get("GLOBAL")!;
  const ownDeptScopeId = ctx.scopeTypes.get("OWN_DEPARTMENT")!;
  const ownTeamScopeId = ctx.scopeTypes.get("OWN_TEAM")!;
  const ownProjScopeId = ctx.scopeTypes.get("OWN_PROJECT")!;

  const allPermissions = await prisma.permission.findMany({ where: { isActive: true } });

  const grantRolePerms = async (
    roleCode: string,
    scopeTypeId: string,
    permissionCodes: string[] | ((code: string) => boolean),
  ) => {
    const roleId = ctx.roles.get(roleCode);
    if (!roleId) return;

    for (const p of allPermissions) {
      const shouldGrant =
        typeof permissionCodes === "function"
          ? permissionCodes(p.code)
          : permissionCodes.includes(p.code);

      if (!shouldGrant) continue;

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

  // 1. SUPER_ADMIN gets ALL declared permissions with GLOBAL scope
  await grantRolePerms("SUPER_ADMIN", globalScopeId, () => true);

  // 2. ENG_DIRECTOR gets org, user, project, storage with OWN_DEPARTMENT scope
  await grantRolePerms("ENG_DIRECTOR", ownDeptScopeId, (code) =>    code.startsWith("organization.") ||
    code.startsWith("project.") ||
    code.startsWith("bd_order.") ||
    code.startsWith("auth.user.") ||
    code.startsWith("storage.") ||
    code.startsWith("station.")
  );

  // 3. PROJECT_MANAGER gets project management, member allocation, approvals, chat, collateral, station shift
  await grantRolePerms("PROJECT_MANAGER", ownDeptScopeId, [
    "organization.department.view",
    "organization.designation.view",
    "organization.team.view",
    "organization.team.manage_members",
    "auth.user.view",
    "station.view",
    "station.join",
    "station.assign_profile",
  ]);
  await grantRolePerms("PROJECT_MANAGER", ownTeamScopeId, [
    "project.view",
    "project.create",
    "project.edit",
    "project.reassign",
    "project.manage_members",
    "project.component.manage",
    "project.client.view",
    "project.financial.view",
    "project.financial.edit",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.chat.pin",
    "project.chat.delete",
    "project.chat.manage_types",
    "project.approval.lead_review",
    "project.approval.auto_approve",
    "project.approval.sales_dispatch",
    "project.collateral.manage",
    "storage.view",
    "storage.upload",
    "storage.delete",
  ]);

  // 4. TECH_LEAD gets team projects, lead reviews, chat, component management, collateral, station join
  await grantRolePerms("TECH_LEAD", ownTeamScopeId, [
    "organization.department.view",
    "organization.team.view",
    "auth.user.view",
    "station.view",
    "station.join",
    "project.view",
    "project.edit",
    "project.component.manage",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.chat.pin",
    "project.chat.delete",
    "project.approval.lead_review",
    "project.collateral.manage",
    "storage.view",
    "storage.upload",
  ]);

  // 5. SR_DEVELOPER & DEVELOPER
  for (const roleCode of ["SR_DEVELOPER", "DEVELOPER"]) {
    await grantRolePerms(roleCode, ownTeamScopeId, [
      "organization.team.view",
      "auth.user.view",
      "station.view",
      "station.join",
    ]);
    await grantRolePerms(roleCode, ownProjScopeId, [
      "project.view",
      "project.chat.view",
      "project.chat.send",
      "project.chat.send_client",
      "project.collateral.manage",
      "storage.view",
      "storage.upload",
    ]);
  }

  // 6. LEAD_DESIGNER & DESIGNER
  await grantRolePerms("LEAD_DESIGNER", ownTeamScopeId, [
    "organization.department.view",
    "organization.team.view",
    "auth.user.view",
    "station.view",
    "station.join",
    "project.view",
    "project.edit",
    "project.component.manage",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.chat.pin",
    "project.approval.lead_review",
    "project.collateral.manage",
    "storage.view",
    "storage.upload",
  ]);
  await grantRolePerms("DESIGNER", ownProjScopeId, [
    "project.view",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.collateral.manage",
    "station.view",
    "station.join",
    "storage.view",
    "storage.upload",
  ]);

  // 7. QA_LEAD & QA_ENGINEER
  await grantRolePerms("QA_LEAD", ownTeamScopeId, [
    "organization.department.view",
    "organization.team.view",
    "auth.user.view",
    "station.view",
    "station.join",
    "project.view",
    "project.component.manage",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.chat.pin",
    "project.approval.lead_review",
    "project.collateral.manage",
    "storage.view",
    "storage.upload",
  ]);
  await grantRolePerms("QA_ENGINEER", ownProjScopeId, [
    "project.view",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.collateral.manage",
    "station.view",
    "station.join",
    "storage.view",
    "storage.upload",
  ]);

  // 8. BD_MANAGER & BD_EXECUTIVE
  await grantRolePerms("BD_MANAGER", ownDeptScopeId, [
    "bd_order.view",
    "bd_order.create",
    "project.view",
    "project.create",
    "project.edit",
    "project.client.view",
    "project.financial.view",
    "project.financial.edit",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.approval.sales_dispatch",
    "station.view",
    "station.manage",
    "station.assign_user",
    "station.assign_profile",
    "station.join",
    "organization.team.view",
    "auth.user.view",
    "storage.view",
    "storage.upload",
  ]);
  await grantRolePerms("BD_EXECUTIVE", ownDeptScopeId, [
    "bd_order.view",
    "bd_order.create",
    "project.view",
    "project.client.view",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "project.approval.sales_dispatch",
    "station.view",
    "station.join",
    "organization.team.view",
    "auth.user.view",
    "storage.view",
    "storage.upload",
  ]);

  // 9. SUPPORT_SPECIALIST
  await grantRolePerms("SUPPORT_SPECIALIST", globalScopeId, [
    "project.view",
    "project.client.view",
    "project.chat.view",
    "project.chat.send",
    "project.chat.send_client",
    "station.view",
    "station.join",
    "auth.user.view",
    "organization.team.view",
    "storage.view",
    "storage.upload",
  ]);

  // 3. Branch Managers
  const saBranchId = ctx.branches.get("BET-SA")!;
  const BRANCH_MANAGERS = [
    { branchId: saBranchId, userEmail: "director.tech@softvence.com", roleTitle: "Head of Operations & Delivery", isPrimary: true },
  ];

  for (const bm of BRANCH_MANAGERS) {
    const user = ctx.users.get(bm.userEmail);
    if (!user) continue;

    const existing = await prisma.branchManager.findFirst({
      where: { branchId: bm.branchId, userId: user.id, unassignedAt: null },
    });

    if (!existing) {
      await prisma.branchManager.create({
        data: {
          branchId: bm.branchId,
          userId: user.id,
          roleTitle: bm.roleTitle,
          isPrimary: bm.isPrimary,
        },
      });
    }
  }

  // 4. Department Managers
  const engDeptId = ctx.departments.get("ENG")!;
  const desDeptId = ctx.departments.get("DES")!;
  const bdDeptId = ctx.departments.get("BD")!;
  const qaDeptId = ctx.departments.get("QA")!;

  const DEPT_MANAGERS = [
    { departmentId: engDeptId, userEmail: "director.tech@softvence.com", roleTitle: "VP of Engineering", isPrimary: true },
    { departmentId: desDeptId, userEmail: "lead.elena@softvence.com", roleTitle: "Head of Product Design", isPrimary: true },
    { departmentId: bdDeptId, userEmail: "bd.rachel@softvence.com", roleTitle: "Director of Business Development", isPrimary: true },
    { departmentId: qaDeptId, userEmail: "qa.tom@softvence.com", roleTitle: "Head of Quality Assurance", isPrimary: true },
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
          roleTitle: dm.roleTitle,
          isPrimary: dm.isPrimary,
        },
      });
    }
  }

  // 5. Team Memberships
  const teamLeadRoleId = ctx.assignmentRoles.get("TEAM_LEAD")!;
  const srDevRoleId = ctx.assignmentRoles.get("SR_DEV")!;
  const devRoleId = ctx.assignmentRoles.get("DEV")!;
  const designerRoleId = ctx.assignmentRoles.get("DESIGNER")!;
  const qaRoleId = ctx.assignmentRoles.get("QA")!;
  const memberRoleId = ctx.assignmentRoles.get("MEMBER")!;

  const TEAM_MEMBERSHIPS: { teamSlug: string; userEmail: string; roleId: string; note?: string }[] = [
    // Web Team
    { teamSlug: "web-team", userEmail: "lead.alex@softvence.com", roleId: teamLeadRoleId, note: "Squad Tech Lead & Architect" },
    { teamSlug: "web-team", userEmail: "dev.james@softvence.com", roleId: srDevRoleId, note: "Backend architecture & API lead" },
    { teamSlug: "web-team", userEmail: "dev.priya@softvence.com", roleId: devRoleId, note: "Frontend React/Next.js specialist" },
    { teamSlug: "web-team", userEmail: "designer.lisa@softvence.com", roleId: designerRoleId, note: "Embedded UI/UX Designer" },
    { teamSlug: "web-team", userEmail: "qa.tom@softvence.com", roleId: qaRoleId, note: "QA & testing coordinator" },

    // Mobile Team
    { teamSlug: "mobile-team", userEmail: "dev.marcus@softvence.com", roleId: teamLeadRoleId, note: "Mobile Tech Lead (Flutter / React Native)" },
    { teamSlug: "mobile-team", userEmail: "dev.priya@softvence.com", roleId: devRoleId, note: "Cross-platform mobile dev" },
    { teamSlug: "mobile-team", userEmail: "qa.emily@softvence.com", roleId: qaRoleId, note: "Mobile QA Test Engineer" },

    // Design Team
    { teamSlug: "design-team", userEmail: "lead.elena@softvence.com", roleId: teamLeadRoleId, note: "Head of Product Design" },
    { teamSlug: "design-team", userEmail: "designer.lisa@softvence.com", roleId: designerRoleId, note: "Senior UI/UX Designer" },

    // AI & Cloud Solutions Team
    { teamSlug: "ai-cloud-team", userEmail: "lead.alex@softvence.com", roleId: teamLeadRoleId, note: "AI Solutions Architect" },
    { teamSlug: "ai-cloud-team", userEmail: "dev.james@softvence.com", roleId: srDevRoleId, note: "Cloud & Infrastructure Engineer" },

    // BD Growth Team
    { teamSlug: "bd-growth-team", userEmail: "bd.rachel@softvence.com", roleId: teamLeadRoleId, note: "Growth Manager & Closer" },
    { teamSlug: "bd-growth-team", userEmail: "bd.kevin@softvence.com", roleId: memberRoleId, note: "Upwork & Fiverr Enterprise Bidder" },

    // BD Leads Team
    { teamSlug: "bd-leads-team", userEmail: "bd.kevin@softvence.com", roleId: teamLeadRoleId, note: "Lead Generation Specialist" },

    // QA Team
    { teamSlug: "qa-team", userEmail: "qa.tom@softvence.com", roleId: teamLeadRoleId, note: "QA Automation Lead" },
    { teamSlug: "qa-team", userEmail: "qa.emily@softvence.com", roleId: qaRoleId, note: "Test Automation Engineer" },

    // Client Success Team
    { teamSlug: "client-success-team", userEmail: "support.anna@softvence.com", roleId: teamLeadRoleId, note: "Client Success Specialist" },
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

  // 6. Agency Platform Profiles & Profile Sellers
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
  const fiverrProfId = ctx.profiles.get("softvence_pro")!;
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

  if (fiverrProfId && kevinUser) {
    const existingSeller = await prisma.profileSeller.findFirst({
      where: { profileId: fiverrProfId, userId: kevinUser.id, unassignedAt: null },
    });
    if (!existingSeller) {
      await prisma.profileSeller.create({
        data: {
          profileId: fiverrProfId,
          userId: kevinUser.id,
          isPrimary: true,
          shift: "General",
        },
      });
    }
  }
}
