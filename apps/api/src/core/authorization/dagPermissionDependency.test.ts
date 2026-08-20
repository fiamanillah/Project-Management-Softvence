import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { AuthorizationEngine, can, getUserPermissions } from "./AuthorizationEngine";
import { OrganizationRoleService } from "@/Modules/Organization/services/organization.role.service";

describe("DAG Permission Dependency & Auto-Cascading Resolution", () => {
  let testDepartmentId: string;
  let testRoleId: string;
  let testUserId: string;
  let granterUserId: string;
  let scopeTypeIdGlobal: string;
  let permProjectViewId: string;
  let permProjectEditId: string;
  let permProjectLeadReviewId: string;
  let permChatSendId: string;
  let permChatViewId: string;
  let permStorageUploadId: string;

  beforeEach(async () => {
    await AuthorizationEngine.getInstance().invalidateCache();

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE 
        "users", "roles", "departments", "designations", 
        "permissions", "permission_scope_types", "role_permissions", 
        "role_permission_scope_targets", "user_permission_overrides", 
        "delegations", "projects", "teams", "team_members", "assignment_roles",
        "project_assignments", "project_components", "component_assignments", 
        "project_team_assignments", "project_groups", "project_group_members",
        "chat_messages", "messages", "issues", "support_tickets",
        "notifications", "refresh_tokens", "password_reset_tokens"
      CASCADE;`
    );

    const dept = await prisma.department.create({
      data: { code: "DAG_ENGINEERING", name: "DAG Engineering" },
    });
    testDepartmentId = dept.id;

    const role = await prisma.role.create({
      data: {
        code: "DEV_LEAD",
        name: "Developer Lead",
        departmentId: testDepartmentId,
        hierarchyLevel: 2,
      },
    });
    testRoleId = role.id;

    const user = await prisma.user.create({
      data: {
        employeeId: `EMP-${Date.now()}`,
        email: `lead-${Date.now()}@softvence.internal`,
        passwordHash: "hash",
        firstName: "Alice",
        lastName: "Lead",
        systemRole: "Staff",
        roleId: testRoleId,
      },
    });
    testUserId = user.id;

    const granter = await prisma.user.create({
      data: {
        employeeId: `ADM-${Date.now()}`,
        email: `admin-${Date.now()}@softvence.internal`,
        passwordHash: "hash",
        firstName: "Super",
        lastName: "Admin",
        systemRole: "SuperAdmin",
        roleId: testRoleId,
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

    // Seed Permissions with Implies & DependsOn
    const pView = await prisma.permission.create({
      data: {
        code: "project.view",
        module: "Projects",
        description: "View project details",
        isActive: true,
        implies: [],
        dependsOn: [],
      },
    });
    permProjectViewId = pView.id;

    const pEdit = await prisma.permission.create({
      data: {
        code: "project.edit",
        module: "Projects",
        description: "Edit project details",
        isActive: true,
        implies: ["project.view"],
        dependsOn: [],
      },
    });
    permProjectEditId = pEdit.id;

    const pLeadReview = await prisma.permission.create({
      data: {
        code: "project.approval.lead_review",
        module: "Projects",
        description: "Perform lead review approval",
        isActive: true,
        implies: ["project.edit"],
        dependsOn: [],
      },
    });
    permProjectLeadReviewId = pLeadReview.id;

    const pStorageUpload = await prisma.permission.create({
      data: {
        code: "storage.upload",
        module: "Storage",
        description: "Upload files to storage",
        isActive: true,
        implies: ["storage.view"],
        dependsOn: [],
      },
    });
    permStorageUploadId = pStorageUpload.id;

    const pChatView = await prisma.permission.create({
      data: {
        code: "project.chat.view",
        module: "Projects",
        description: "View project chat messages",
        isActive: true,
        implies: ["project.view"],
        dependsOn: [],
      },
    });
    permChatViewId = pChatView.id;

    const pChatSend = await prisma.permission.create({
      data: {
        code: "project.chat.send",
        module: "Projects",
        description: "Send message in internal chat",
        isActive: true,
        implies: ["project.chat.view"],
        dependsOn: ["storage.upload", "storage.view"],
      },
    });
    permChatSendId = pChatSend.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE 
        "users", "roles", "departments", "designations", 
        "permissions", "permission_scope_types", "role_permissions", 
        "role_permission_scope_targets", "user_permission_overrides", 
        "delegations", "projects", "teams", "team_members", "assignment_roles",
        "project_assignments", "project_components", "component_assignments", 
        "project_team_assignments", "project_groups", "project_group_members",
        "chat_messages", "messages", "issues", "support_tickets",
        "notifications", "refresh_tokens", "password_reset_tokens"
      CASCADE;`
    );
  });

  it("Runtime: Direct role grant of project.edit should allow can(user, 'project.view') via DAG implies", async () => {
    // Only grant project.edit to the role
    await prisma.rolePermission.create({
      data: {
        roleId: testRoleId,
        permissionId: permProjectEditId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      roleId: testRoleId,
    };

    // User should have both project.edit and implied project.view
    const canEdit = await can(staffUser, "project.edit");
    const canView = await can(staffUser, "project.view");

    expect(canEdit).toBe(true);
    expect(canView).toBe(true);
  });

  it("Runtime: Transitive DAG closure in getUserPermissions should evaluate full implication tree", async () => {
    // Grant only top-level project.approval.lead_review (which implies project.edit, which implies project.view)
    await prisma.rolePermission.create({
      data: {
        roleId: testRoleId,
        permissionId: permProjectLeadReviewId,
        scopeTypeId: scopeTypeIdGlobal,
        grantedBy: granterUserId,
      },
    });

    const staffUser = {
      id: testUserId,
      systemRole: "Staff",
      roleId: testRoleId,
    };

    const permMap = await getUserPermissions(staffUser);

    expect(permMap["project.approval.lead_review"].allowed).toBe(true);
    expect(permMap["project.edit"].allowed).toBe(true);
    expect(permMap["project.view"].allowed).toBe(true);
  });

  it("Service: Role assignment auto-expansion should automatically expand implies + dependsOn", async () => {
    const roleService = new OrganizationRoleService(prisma);

    // Save permissions for role with only project.chat.send
    await roleService.saveRolePermissions(
      testRoleId,
      {
        assignments: [
          {
            permissionId: permChatSendId,
            scopeTypeId: scopeTypeIdGlobal,
          },
        ],
      },
      granterUserId,
    );

    // Fetch persisted grants from DB
    const persisted = await prisma.rolePermission.findMany({
      where: { roleId: testRoleId },
      include: { permission: true },
    });

    const grantedCodes = persisted.map((p) => p.permission.code);

    // Should include project.chat.send and expanded prerequisites
    expect(grantedCodes).toContain("project.chat.send");
    expect(grantedCodes).toContain("project.chat.view");
    expect(grantedCodes).toContain("project.view");
    expect(grantedCodes).toContain("storage.upload");
  });
});
