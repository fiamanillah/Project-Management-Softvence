import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { UsersService } from "./users.service";
import { OrganizationService } from "../Organization/organization.service";

describe("User Profile & Avatar Management", () => {
  let usersService: UsersService;
  let orgService: OrganizationService;
  let testDepartment: any;
  let testRole: any;
  let testDesignation: any;

  beforeEach(async () => {
    usersService = new UsersService(prisma);
    orgService = new OrganizationService(prisma);

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
      isActive: true,
    });

    testDesignation = await orgService.createDesignation({
      code: "SE",
      name: "Software Engineer",
      departmentId: testDepartment.id,
      hierarchyLevel: 1,
      isLeadership: false,
      isActive: true,
    });
  });

  it("1. should create user and get profile including role and designation", async () => {
    const user = await usersService.createAdminUser({
      email: "profile_test@example.com",
      firstName: "John",
      lastName: "Doe",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const profile = await usersService.getProfile(user.id);
    expect(profile).toBeDefined();
    expect(profile.id).toBe(user.id);
    expect(profile.email).toBe("profile_test@example.com");
    expect(profile.firstName).toBe("John");
    expect(profile.lastName).toBe("Doe");
    expect(profile.role?.name).toBe("Software Engineer Role");
    expect(profile.designation?.name).toBe("Software Engineer");
    expect(profile.avatarUrl).toBeNull();
  });

  it("2. should update user profile name and avatarUrl", async () => {
    const user = await usersService.createAdminUser({
      email: "profile_update@example.com",
      firstName: "Alice",
      lastName: "Smith",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const updated = await usersService.updateProfile(user.id, {
      firstName: "Alicia",
      lastName: "Johnson",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    expect(updated.firstName).toBe("Alicia");
    expect(updated.lastName).toBe("Johnson");
    expect(updated.avatarUrl).toBe("https://example.com/avatar.jpg");

    // Verify persisted in database
    const fetched = await usersService.getProfile(user.id);
    expect(fetched.firstName).toBe("Alicia");
    expect(fetched.lastName).toBe("Johnson");
    expect(fetched.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("3. should upload user avatar file and update user record", async () => {
    const user = await usersService.createAdminUser({
      email: "avatar_upload@example.com",
      firstName: "Bob",
      lastName: "Builder",
      systemRole: "Staff",
      roleId: testRole.id,
      designationId: testDesignation.id,
    });

    const fakeImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    ]);

    const fakeFile: any = {
      fieldname: "avatar",
      originalname: "test-profile.png",
      encoding: "7bit",
      mimetype: "image/png",
      buffer: fakeImageBuffer,
      size: fakeImageBuffer.length,
    };

    const result = await usersService.uploadAvatar(user.id, fakeFile);
    expect(result).toBeDefined();
    expect(result.avatarUrl).toBeDefined();
    expect(result.user.avatarUrl).toBe(result.avatarUrl);

    // Verify persisted
    const fetched = await usersService.getProfile(user.id);
    expect(fetched.avatarUrl).toBe(result.avatarUrl);
  });

  it("4. should reject non-image file upload", async () => {
    const user = await usersService.createAdminUser({
      email: "invalid_file@example.com",
      firstName: "Charlie",
      lastName: "Brown",
      systemRole: "Staff",
      roleId: testRole.id,
    });

    const fakePdfFile: any = {
      fieldname: "avatar",
      originalname: "document.pdf",
      encoding: "7bit",
      mimetype: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
      size: 16,
    };

    expect(usersService.uploadAvatar(user.id, fakePdfFile)).rejects.toThrow();
  });

  it("5. should remove user avatar and reset to null", async () => {
    const user = await usersService.createAdminUser({
      email: "avatar_remove@example.com",
      firstName: "Diana",
      lastName: "Prince",
      systemRole: "Staff",
      roleId: testRole.id,
      avatarUrl: "https://example.com/diana.png",
    });

    expect(user.avatarUrl).toBe("https://example.com/diana.png");

    const removeResult = await usersService.removeAvatar(user.id);
    expect(removeResult.message).toBe("Avatar removed successfully");
    expect(removeResult.user.avatarUrl).toBeNull();

    const fetched = await usersService.getProfile(user.id);
    expect(fetched.avatarUrl).toBeNull();
  });
});
