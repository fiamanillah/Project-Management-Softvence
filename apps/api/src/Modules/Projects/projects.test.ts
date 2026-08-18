// src/Modules/Projects/projects.test.ts

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { ProjectsService } from "./projects.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";

describe("Projects Module & Sensitive Field Permissions", () => {
  let projectsService: ProjectsService;
  let superAdminUser: AuthenticatedUser;
  let restrictedUser: AuthenticatedUser;
  let sampleStatusId: string;
  let samplePlatformId: string;
  let sampleProfileId: string;
  let sampleClientId: string;
  let sampleServiceLineId: string;
  let sampleTeamId: string;
  let sampleRoleId: string;
  let createdProjectId: string;

  beforeAll(async () => {
    projectsService = new ProjectsService(prisma);

    // Ensure status fixture exists
    let status = await prisma.projectStatus.findFirst({ where: { code: "IN_PROGRESS" } });
    if (!status) {
      status = await prisma.projectStatus.create({
        data: { code: "IN_PROGRESS", name: "In Progress", requiresAction: true, isTerminal: false },
      });
    }
    sampleStatusId = status.id;

    // Ensure platform fixture exists
    let platform = await prisma.platform.findFirst({ where: { code: "UPWORK" } });
    if (!platform) {
      platform = await prisma.platform.create({
        data: { code: "UPWORK", name: "Upwork", isActive: true },
      });
    }
    samplePlatformId = platform.id;

    // Ensure service line fixture exists
    let serviceLine = await prisma.serviceLine.findFirst({ where: { slug: "web-app-dev" } });
    if (!serviceLine) {
      serviceLine = await prisma.serviceLine.create({
        data: { name: "Web Application Development", slug: "web-app-dev", isActive: true },
      });
    }
    sampleServiceLineId = serviceLine.id;

    // Ensure assignment role fixture exists
    let role = await prisma.assignmentRole.findFirst({ where: { code: "TEAM_LEAD" } });
    if (!role) {
      role = await prisma.assignmentRole.create({
        data: { code: "TEAM_LEAD", name: "Team Lead", qualifiesForTeamScope: true, isActive: true },
      });
    }
    sampleRoleId = role.id;

    // Ensure sample client exists
    let client = await prisma.client.findFirst({ where: { name: "Test Corp Global" } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: "Test Corp Global",
          platformId: samplePlatformId,
          contactNotes: "Confidential Client Direct Contact: test@testcorp.com",
        },
      });
    }
    sampleClientId = client.id;

    // Ensure sample profile exists
    let profile = await prisma.profile.findFirst({ where: { username: "TestProfile" } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          platformId: samplePlatformId,
          username: "TestProfile",
          isActive: true,
        },
      });
    }
    sampleProfileId = profile.id;

    // Ensure test department and team exist
    let dept = await prisma.department.findFirst({ where: { code: "ENG_TEST" } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { code: "ENG_TEST", name: "Engineering Test" },
      });
    }

    let team = await prisma.team.findFirst({ where: { slug: "test-alpha-team" } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: "Test Alpha Team",
          slug: "test-alpha-team",
          departmentId: dept.id,
        },
      });
    }
    sampleTeamId = team.id;

    // Setup SuperAdmin Actor
    superAdminUser = {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@softvence.test",
      systemRole: "SuperAdmin",
      roleId: "",
      designationId: undefined,
    };

    // Setup Restricted Regular Staff Actor
    restrictedUser = {
      id: "00000000-0000-0000-0000-000000000002",
      email: "staff@softvence.test",
      systemRole: "Staff",
      roleId: "00000000-0000-0000-0000-000000000003",
      designationId: undefined,
    };
  });

  afterAll(async () => {
    // Cleanup created test project
    if (createdProjectId) {
      await prisma.projectComponent.deleteMany({ where: { projectId: createdProjectId } });
      await prisma.projectAssignment.deleteMany({ where: { projectId: createdProjectId } });
      await prisma.projectTeamAssignment.deleteMany({ where: { projectId: createdProjectId } });
      await prisma.project.deleteMany({ where: { id: createdProjectId } });
    }
  });

  it("1. SuperAdmin can create a project with initial teams, members, and components", async () => {
    const testOrderId = `ORD-TEST-${Date.now()}`;
    const project = await projectsService.createProject(
      {
        projectName: "Enterprise SaaS Platform",
        orderId: testOrderId,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
        value: 12500,
        orderSheetUrl: "https://docs.google.com/spreadsheets/d/test-order-sheet",
        startDate: new Date().toISOString(),
        deliveryDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        assignedTeamIds: [sampleTeamId],
        initialMembers: [],
        initialComponents: [
          { name: "Core API Architecture", statusId: sampleStatusId },
          { name: "Frontend Dashboard UI", statusId: sampleStatusId },
        ],
      },
      superAdminUser,
    );

    expect(project).toBeDefined();
    expect(project.projectName).toBe("Enterprise SaaS Platform");
    expect(project.orderId).toBe(testOrderId);
    expect(project.value).toBe(12500);
    expect(project.orderSheetUrl).toBe("https://docs.google.com/spreadsheets/d/test-order-sheet");
    expect(project.client).toBeDefined();
    expect(project.client?.name).toBe("Test Corp Global");
    expect(project.components.length).toBe(2);
    expect(project._capabilities?.canEdit).toBe(true);
    expect(project._capabilities?.canDelete).toBe(true);
    expect(project._capabilities?.canViewClient).toBe(true);
    expect(project._capabilities?.canViewFinancials).toBe(true);

    createdProjectId = project.id;
  });

  it("2. Restricted user WITHOUT sensitive permissions has client name & financial value masked", async () => {
    const sanitized = await projectsService.sanitizeAndDecorateProject(
      {
        id: createdProjectId,
        projectName: "Enterprise SaaS Platform",
        orderId: "ORD-TEST",
        statusId: sampleStatusId,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        value: 12500,
        orderSheetUrl: "https://docs.google.com/spreadsheets/d/test-order-sheet",
        startDate: new Date(),
        deliveryDate: new Date(),
        client: { id: sampleClientId, name: "Test Corp Global" },
        teamAssignments: [{ teamId: sampleTeamId, team: { id: sampleTeamId, departmentId: "dept-1" } }],
      },
      restrictedUser,
    );

    // Client identity must be completely stripped/null
    expect(sanitized.client).toBeNull();
    expect(sanitized.clientId).toBeNull();
    expect(sanitized._capabilities?.canViewClient).toBe(false);

    // Financial values must be completely stripped/null
    expect(sanitized.value).toBeNull();
    expect(sanitized.orderSheetUrl).toBeNull();
    expect(sanitized._capabilities?.canViewFinancials).toBe(false);
  });

  it("3. SuperAdmin can update project details and modify financials", async () => {
    const updated = await projectsService.updateProject(
      createdProjectId,
      {
        projectName: "Enterprise SaaS Platform (Phase 2)",
        value: 15000,
      },
      superAdminUser,
    );

    expect(updated.projectName).toBe("Enterprise SaaS Platform (Phase 2)");
    expect(updated.value).toBe(15000);
  });

  it("4. SuperAdmin can soft-delete a project (Rule BE-14)", async () => {
    const result = await projectsService.deleteProject(createdProjectId, superAdminUser);
    expect(result.success).toBe(true);

    const deletedRecord = await prisma.project.findUnique({
      where: { id: createdProjectId },
    });
    expect(deletedRecord?.deletedAt).not.toBeNull();
  });

  it("5. SuperAdmin can quick-create dynamic lookup entities on the fly", async () => {
    const timestamp = Date.now();
    // Quick Platform
    const platform = await projectsService.createPlatform(
      { name: `Direct Referral ${timestamp}`, code: `DIRECT_REF_${timestamp}` },
      superAdminUser,
    );
    expect(platform.name).toBe(`Direct Referral ${timestamp}`);
    expect(platform.code).toBe(`DIRECT_REF_${timestamp}`);

    // Quick Profile
    const profile = await projectsService.createProfile(
      { platformId: platform.id, username: `agency_lead_${timestamp}`, isActive: true },
      superAdminUser,
    );
    expect(profile.username).toBe(`agency_lead_${timestamp}`);
    expect(profile.platformId).toBe(platform.id);

    // Quick Client
    const client = await projectsService.createClient(
      { name: `Apex Dynamics ${timestamp}`, platformId: platform.id, contactNotes: "Lead via Direct", isActive: true },
      superAdminUser,
    );
    expect(client.name).toBe(`Apex Dynamics ${timestamp}`);
    expect(client.platformId).toBe(platform.id);

    // Quick Service Line
    const serviceLine = await projectsService.createServiceLine(
      { name: `Data Science ${timestamp}`, slug: `data-science-${timestamp}`, isActive: true },
      superAdminUser,
    );
    expect(serviceLine.name).toBe(`Data Science ${timestamp}`);
    expect(serviceLine.slug).toBe(`data-science-${timestamp}`);

    // Quick Status
    const status = await projectsService.createStatus(
      { name: `Under QA ${timestamp}`, code: `QA_${timestamp}`, color: "#8b5cf6", requiresAction: true, isActive: true },
      superAdminUser,
    );
    expect(status.name).toBe(`Under QA ${timestamp}`);
    expect(status.code).toBe(`QA_${timestamp}`);
    expect(status.requiresAction).toBe(true);
  });

  it("6. User with OwnTeam scope can view their team's projects and is blocked from other teams", async () => {
    // 1. Create Team A and Team B
    const dept = await prisma.department.findFirstOrThrow();
    const teamA = await prisma.team.create({
      data: { name: `Team Alpha ${Date.now()}`, slug: `team-alpha-${Date.now()}`, departmentId: dept.id },
    });
    const teamB = await prisma.team.create({
      data: { name: `Team Beta ${Date.now()}`, slug: `team-beta-${Date.now()}`, departmentId: dept.id },
    });

    // 2. Create Role with OwnTeam scope for project.view
    const scopeTypeOwnTeam = await prisma.permissionScopeType.findFirst({
      where: { resolutionStrategy: "OwnTeam" },
    }) || await prisma.permissionScopeType.create({
      data: { code: "OWN_TEAM_TEST", name: "Own Team Scope", resolutionStrategy: "OwnTeam" },
    });

    const permView = await prisma.permission.findUnique({
      where: { code: "project.view" },
    }) || await prisma.permission.create({
      data: { code: "project.view", module: "Projects", description: "View", isActive: true },
    });

    const ownTeamRole = await prisma.role.create({
      data: { code: `ROLE_TEAM_VIEWER_${Date.now()}`, name: "Team Viewer Role", hierarchyLevel: 3 },
    });

    // 3. Create User in Team A
    const teamAUser = await prisma.user.create({
      data: {
        employeeId: `EMP-${Date.now()}`,
        email: `team_a_user_${Date.now()}@softvence.test`,
        passwordHash: "hash",
        firstName: "Alpha",
        lastName: "Member",
        systemRole: "Staff",
        roleId: ownTeamRole.id,
      },
    });

    await prisma.rolePermission.create({
      data: {
        roleId: ownTeamRole.id,
        permissionId: permView.id,
        scopeTypeId: scopeTypeOwnTeam.id,
        grantedBy: teamAUser.id,
      },
    });

    const assignRole = await prisma.assignmentRole.findFirstOrThrow();
    await prisma.teamMember.create({
      data: {
        teamId: teamA.id,
        userId: teamAUser.id,
        roleId: assignRole.id,
        leftAt: null,
      },
    });

    const actorUser: AuthenticatedUser = {
      id: teamAUser.id,
      email: teamAUser.email,
      systemRole: "Staff",
      roleId: ownTeamRole.id,
      designationId: undefined,
    };

    // 4. Create Project A (assigned to Team A) and Project B (assigned to Team B)
    const projectA = await projectsService.createProject(
      {
        projectName: "Project for Team A",
        orderId: `ORD-A-${Date.now()}`,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
        value: 5000,
        assignedTeamIds: [teamA.id],
      },
      superAdminUser,
    );

    const projectB = await projectsService.createProject(
      {
        projectName: "Project for Team B",
        orderId: `ORD-B-${Date.now()}`,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
        value: 9000,
        assignedTeamIds: [teamB.id],
      },
      superAdminUser,
    );

    // 5. Team A user lists projects
    const listResult = await projectsService.getProjects({}, actorUser);
    const visibleProjectIds = listResult.items.map((p) => p.id);
    expect(visibleProjectIds).toContain(projectA.id);
    expect(visibleProjectIds).not.toContain(projectB.id);

    // 6. Team A user views Project A details -> succeeds
    const projectADetail = await projectsService.getProjectById(projectA.id, actorUser);
    expect(projectADetail.id).toBe(projectA.id);

    // 7. Team A user attempts to view Project B details -> blocked with 403
    let errorCaught: any = null;
    try {
      await projectsService.getProjectById(projectB.id, actorUser);
    } catch (err) {
      errorCaught = err;
    }
    expect(errorCaught).not.toBeNull();
    expect(errorCaught.statusCode).toBe(403);
  });

  it("7. Auto-generates structured project code (PRJ-YYYYMM-XXXX) when projectName is omitted", async () => {
    const testOrderId = `ORD-AUTO-${Date.now()}`;
    const project = await projectsService.createProject(
      {
        orderId: testOrderId,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
      },
      superAdminUser,
    );

    expect(project.projectName).toMatch(/^PRJ-\d{6}-\d{4}$/);
    expect(project.orderId).toBe(testOrderId);
  });

  it("8. Supports parent project and nested sub-project / child order hierarchy", async () => {
    const parentOrderId = `ORD-PARENT-${Date.now()}`;
    const parentProject = await projectsService.createProject(
      {
        orderId: parentOrderId,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
        value: 10000,
      },
      superAdminUser,
    );

    const childOrderId = `ORD-CHILD-${Date.now()}`;
    const childProject = await projectsService.createProject(
      {
        orderId: childOrderId,
        parentId: parentProject.id,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
        value: 4000,
      },
      superAdminUser,
    );

    expect(childProject.parentId).toBe(parentProject.id);
    expect(childProject.parentOrderId).toBe(parentOrderId);

    // Fetch parent detail and verify subProjects array contains child
    const parentDetail = await projectsService.getProjectById(parentProject.id, superAdminUser);
    expect(parentDetail.subProjects).toBeDefined();
    expect(parentDetail.subProjects?.some((sp) => sp.id === childProject.id)).toBe(true);

    // Fetch child detail and verify parentProject is populated
    const childDetail = await projectsService.getProjectById(childProject.id, superAdminUser);
    expect(childDetail.parentProject).toBeDefined();
    expect(childDetail.parentProject?.id).toBe(parentProject.id);
    expect(childDetail.parentProject?.orderId).toBe(parentOrderId);
  });

  it("9. Prevents circular references in parent project assignment", async () => {
    const projA = await projectsService.createProject(
      {
        orderId: `ORD-CYC-A-${Date.now()}`,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
      },
      superAdminUser,
    );

    const projB = await projectsService.createProject(
      {
        orderId: `ORD-CYC-B-${Date.now()}`,
        parentId: projA.id,
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
      },
      superAdminUser,
    );

    // Setting Proj A's parent to Proj B should throw BadRequestError (circular hierarchy)
    let cycleError: any = null;
    try {
      await projectsService.updateProject(projA.id, { parentId: projB.id }, superAdminUser);
    } catch (err) {
      cycleError = err;
    }

    expect(cycleError).not.toBeNull();
    expect(cycleError.statusCode).toBe(400);
  });

  it("10. Supports operational spreadsheet fields (Amount, Percentage, Email, Order Link, Remarks, Service) and masks accordingly", async () => {
    const timestamp = Date.now();
    const orderId = `ORD-OPS-${timestamp}`;

    const project = await projectsService.createProject(
      {
        orderId,
        service: "Enterprise E-Commerce Store",
        email: `contact_${timestamp}@example.com`,
        orderLink: "https://www.fiverr.com/orders/FO918234",
        remarks: "Urgent milestone delivery for European client",
        clientId: sampleClientId,
        profileId: sampleProfileId,
        serviceLineId: sampleServiceLineId,
        statusId: sampleStatusId,
        assignedTeamIds: [sampleTeamId],
        value: 1200,
        amount: 960,
        percentage: 20,
      },
      superAdminUser,
    );

    expect(project.service).toBe("Enterprise E-Commerce Store");
    expect(project.email).toBe(`contact_${timestamp}@example.com`);
    expect(project.orderLink).toBe("https://www.fiverr.com/orders/FO918234");
    expect(project.remarks).toBe("Urgent milestone delivery for European client");
    expect(project.value).toBe(1200);
    expect(project.amount).toBe(960);
    expect(project.percentage).toBe(20);

    // Sanitize for non-privileged restricted user -> email, amount, percentage, value must be null
    const normalView = await projectsService.sanitizeAndDecorateProject(project, restrictedUser);
    expect(normalView.service).toBe("Enterprise E-Commerce Store");
    expect(normalView.orderLink).toBe("https://www.fiverr.com/orders/FO918234");
    expect(normalView.remarks).toBe("Urgent milestone delivery for European client");
    expect(normalView.email).toBeNull();
    expect(normalView.amount).toBeNull();
    expect(normalView.percentage).toBeNull();
    expect(normalView.value).toBeNull();
  });
});


