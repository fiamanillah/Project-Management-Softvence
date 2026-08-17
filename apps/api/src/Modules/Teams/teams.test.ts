import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { TeamsService } from "./teams.service";
import { AuthorizationEngine } from "@/core/authorization/AuthorizationEngine";

describe("TeamsService & Teams Architecture", () => {
  let teamsService: TeamsService;

  beforeEach(async () => {
    teamsService = new TeamsService(prisma);

    // Clean tables
    await prisma.notification.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.departmentManager.deleteMany({});
    await prisma.userPermissionOverride.deleteMany({});
    await prisma.rolePermissionScopeTarget.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.projectAssignment.deleteMany({});
    await prisma.componentAssignment.deleteMany({});
    await prisma.projectComponent.deleteMany({});
    await prisma.projectTeamAssignment.deleteMany({});
    await prisma.componentTeamAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
  });

  it("should create a team with auto-generated slug and retrieve it", async () => {
    const dept = await prisma.department.create({
      data: {
        code: "ENG",
        name: "Engineering",
      },
    });

    const team = await teamsService.createTeam({
      name: "Frontend Core Team",
      departmentId: dept.id,
      shift: "Day",
      isActive: true,
    });

    expect(team).toBeDefined();
    expect(team.name).toBe("Frontend Core Team");
    expect(team.slug).toBe("frontend-core-team");
    expect(team.shift).toBe("Day");
    expect(team.departmentId).toBe(dept.id);
    expect(team.department.code).toBe("ENG");
    expect(team.activeMembers.length).toBe(0);
  });

  it("should prevent duplicate team slugs", async () => {
    const dept = await prisma.department.create({
      data: {
        code: "DES",
        name: "Design Department",
      },
    });

    await teamsService.createTeam({
      name: "UI/UX Team",
      slug: "uiux-team",
      departmentId: dept.id,
    });

    expect(
      teamsService.createTeam({
        name: "UI/UX Team Duplicate",
        slug: "uiux-team",
        departmentId: dept.id,
      }),
    ).rejects.toThrow("already exists");
  });

  it("should list teams with pagination, search, and _capabilities", async () => {
    const dept = await prisma.department.create({
      data: {
        code: "PRODUCT",
        name: "Product Division",
      },
    });

    await teamsService.createTeam({
      name: "Mobile Team",
      departmentId: dept.id,
      shift: "Day",
    });

    await teamsService.createTeam({
      name: "Backend Team",
      departmentId: dept.id,
      shift: "Night",
    });

    const actor = {
      id: "00000000-0000-0000-0000-000000000001",
      email: "superadmin@example.com",
      systemRole: "SuperAdmin" as const,
      roleId: "00000000-0000-0000-0000-000000000002",
      designationId: "00000000-0000-0000-0000-000000000003",
    };

    const result = await teamsService.getTeams({ page: 1, limit: 10, search: "Mobile" }, actor);
    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toBe("Mobile Team");
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]._capabilities?.canEdit).toBe(true);
    expect(result.items[0]._capabilities?.canDelete).toBe(true);
    expect(result.items[0]._capabilities?.canManageMembers).toBe(true);
  });

  it("should add a team member, update role, and soft-remove with leftAt (Rule BE-14 & BE-10)", async () => {
    const dept = await prisma.department.create({
      data: {
        code: "QA",
        name: "Quality Assurance",
      },
    });

    const role = await prisma.role.create({
      data: {
        code: "QA_ROLE",
        name: "QA Role",
        departmentId: dept.id,
        hierarchyLevel: 3,
      },
    });

    const designation = await prisma.designation.create({
      data: {
        code: "QA_ENG",
        name: "QA Engineer",
        departmentId: dept.id,
        hierarchyLevel: 3,
      },
    });

    const user = await prisma.user.create({
      data: {
        employeeId: "EMP-101",
        email: "tester@example.com",
        passwordHash: "hash",
        firstName: "Test",
        lastName: "User",
        systemRole: "Staff",
        roleId: role.id,
        designationId: designation.id,
      },
    });

    const leadRole = await prisma.assignmentRole.create({
      data: {
        code: "TEAM_LEAD",
        name: "Team Lead",
        qualifiesForTeamScope: true,
        isActive: true,
      },
    });

    const memberRole = await prisma.assignmentRole.create({
      data: {
        code: "MEMBER",
        name: "Team Member",
        qualifiesForTeamScope: false,
        isActive: true,
      },
    });

    const team = await teamsService.createTeam({
      name: "Automation Team",
      departmentId: dept.id,
    });

    // 1. Add member
    const added = await teamsService.addTeamMember(team.id, {
      userId: user.id,
      roleId: leadRole.id,
      note: "Promoted to Lead",
    });

    expect(added.userId).toBe(user.id);
    expect(added.roleId).toBe(leadRole.id);
    expect(added.leftAt).toBeNull();
    expect(added.role.qualifiesForTeamScope).toBe(true);

    // 2. Prevent duplicate active membership
    expect(
      teamsService.addTeamMember(team.id, {
        userId: user.id,
        roleId: memberRole.id,
      }),
    ).rejects.toThrow("already an active member");

    // 3. Update member role
    const updated = await teamsService.updateTeamMember(team.id, added.id, {
      roleId: memberRole.id,
      note: "Demoted to Member",
    });
    expect(updated.roleId).toBe(memberRole.id);
    expect(updated.role.qualifiesForTeamScope).toBe(false);

    // 4. Soft-remove member (BE-14: sets leftAt, never hard deletes)
    const removeResult = await teamsService.removeTeamMember(team.id, added.id);
    expect(removeResult.id).toBe(added.id);

    const teamDetails = await teamsService.getTeamById(team.id);
    expect(teamDetails.activeMembers.length).toBe(0);
    expect(teamDetails.pastMembers.length).toBe(1);
    expect(teamDetails.pastMembers[0].leftAt).not.toBeNull();

    // 5. Re-adding user creates a new record while preserving history
    const reAdded = await teamsService.addTeamMember(team.id, {
      userId: user.id,
      roleId: leadRole.id,
    });
    expect(reAdded.id).not.toBe(added.id);

    const fullHistory = await teamsService.getTeamMembers(team.id);
    expect(fullHistory.length).toBe(2);
  });

  it("should calculate aggregate team stats accurately", async () => {
    const dept1 = await prisma.department.create({
      data: { code: "DEPT1", name: "Dept 1" },
    });
    const dept2 = await prisma.department.create({
      data: { code: "DEPT2", name: "Dept 2" },
    });

    await teamsService.createTeam({
      name: "Team Alpha",
      departmentId: dept1.id,
      isActive: true,
    });

    await teamsService.createTeam({
      name: "Team Beta",
      departmentId: dept2.id,
      isActive: true,
    });

    await teamsService.createTeam({
      name: "Team Gamma (Archived)",
      departmentId: dept2.id,
      isActive: false,
    });

    const stats = await teamsService.getTeamStats();
    expect(stats.totalTeams).toBe(3);
    expect(stats.activeTeams).toBe(2);
    expect(stats.totalDepartmentsRepresented).toBe(2);
  });
});
