import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { TeamsService } from "./teams.service";

describe("Team Avatar Management", () => {
  let teamsService: TeamsService;
  let testDepartment: any;

  beforeEach(async () => {
    teamsService = new TeamsService(prisma);

    // Clean tables
    await prisma.chatMessageRead.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.projectGroupMember.deleteMany({});
    await prisma.projectGroup.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.issueComment.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    await prisma.messageApproval.deleteMany({});
    await prisma.messageRevision.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.platformThreadMessage.deleteMany({});
    await prisma.bdOrderAssignment.deleteMany({});
    await prisma.bdOrder.deleteMany({});
    await prisma.profileSeller.deleteMany({});
    await prisma.userAbsence.deleteMany({});
    await prisma.delegation.deleteMany({});
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
    await prisma.componentTeamAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.assignmentRole.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});

    testDepartment = await prisma.department.create({
      data: {
        code: "ENG",
        name: "Engineering",
        isActive: true,
      },
    });
  });

  it("1. should create a team with initial avatarUrl", async () => {
    const team = await teamsService.createTeam({
      name: "Alpha Squad",
      departmentId: testDepartment.id,
      shift: "Day",
      avatarUrl: "https://example.com/alpha-logo.png",
      isActive: true,
    });

    expect(team).toBeDefined();
    expect(team.name).toBe("Alpha Squad");
    expect(team.avatarUrl).toBe("https://example.com/alpha-logo.png");
  });

  it("2. should update team avatarUrl via updateTeam", async () => {
    const team = await teamsService.createTeam({
      name: "Beta Squad",
      departmentId: testDepartment.id,
      isActive: true,
    });

    expect(team.avatarUrl).toBeNull();

    const updated = await teamsService.updateTeam(team.id, {
      avatarUrl: "https://example.com/beta-logo.png",
    });

    expect(updated.avatarUrl).toBe("https://example.com/beta-logo.png");

    const fetched = await teamsService.getTeamById(team.id);
    expect(fetched.avatarUrl).toBe("https://example.com/beta-logo.png");
  });

  it("3. should upload team avatar file and persist public URL", async () => {
    const team = await teamsService.createTeam({
      name: "Gamma Squad",
      departmentId: testDepartment.id,
      isActive: true,
    });

    const fakeImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    ]);

    const fakeFile: any = {
      fieldname: "avatar",
      originalname: "team-gamma.png",
      encoding: "7bit",
      mimetype: "image/png",
      buffer: fakeImageBuffer,
      size: fakeImageBuffer.length,
    };

    const result = await teamsService.uploadAvatar(team.id, fakeFile);
    expect(result).toBeDefined();
    expect(result.avatarUrl).toBeDefined();
    expect(result.team.avatarUrl).toBe(result.avatarUrl);

    const fetched = await teamsService.getTeamById(team.id);
    expect(fetched.avatarUrl).toBe(result.avatarUrl);
  });

  it("4. should reject non-image file upload for team", async () => {
    const team = await teamsService.createTeam({
      name: "Delta Squad",
      departmentId: testDepartment.id,
      isActive: true,
    });

    const fakeTxtFile: any = {
      fieldname: "avatar",
      originalname: "notes.txt",
      encoding: "7bit",
      mimetype: "text/plain",
      buffer: Buffer.from("plain text"),
      size: 10,
    };

    expect(teamsService.uploadAvatar(team.id, fakeTxtFile)).rejects.toThrow();
  });

  it("5. should remove team avatar and reset to null", async () => {
    const team = await teamsService.createTeam({
      name: "Omega Squad",
      departmentId: testDepartment.id,
      avatarUrl: "https://example.com/omega-team.png",
      isActive: true,
    });

    expect(team.avatarUrl).toBe("https://example.com/omega-team.png");

    const removeResult = await teamsService.removeAvatar(team.id);
    expect(removeResult.message).toBe("Team avatar removed successfully");
    expect(removeResult.team.avatarUrl).toBeNull();

    const fetched = await teamsService.getTeamById(team.id);
    expect(fetched.avatarUrl).toBeNull();
  });
});
