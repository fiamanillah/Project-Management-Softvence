import { describe, it, expect, beforeEach } from "bun:test";
import { prisma } from "@/lib/prisma";
import { OrganizationService } from "./organization.service";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";

describe("Unified Organization Structure Engine", () => {
  let orgService: OrganizationService;

  const cleanDatabase = async () => {
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
  };

  beforeEach(async () => {
    orgService = new OrganizationService(prisma);
    await cleanDatabase();
  });

  it("should assemble a unified multi-tier hierarchy (Branch -> Sub-Branch -> Department -> Team)", async () => {
    // 1. Create Holding Branch
    const holdingBranch = await orgService.createBranch({
      code: "BET-HQ",
      name: "Betopia Group Holding HQ",
    });

    // 2. Create Flagship Sub-Branch
    const alphaBranch = await orgService.createBranch({
      code: "BET-SA",
      name: "Softvence Alpha",
      parentId: holdingBranch.id,
    });

    // 3. Create Department under Softvence Alpha
    const engDept = await orgService.createDepartment({
      code: "ENG",
      name: "Software Engineering",
      branchId: alphaBranch.id,
    });

    // 4. Create Sub-Department
    const frontendDept = await orgService.createDepartment({
      code: "ENG-FE",
      name: "Frontend Division",
      branchId: alphaBranch.id,
      parentId: engDept.id,
    });

    // 5. Create Team under Frontend Division
    const webTeam = await prisma.team.create({
      data: {
        name: "React Web Core Team",
        slug: "react-web-core-team",
        departmentId: frontendDept.id,
        isActive: true,
      },
    });

    // 6. Create Global Corporate HQ Department (branchId is null)
    const legalDept = await orgService.createDepartment({
      code: "LEGAL",
      name: "Corporate Legal Affairs",
    });

    // 7. Query unified structure as SuperAdmin
    const superAdminActor: AuthenticatedUser = {
      id: "admin-1",
      systemRole: "SuperAdmin",
      branchId: null,
    };

    const res = await orgService.getOrganizationStructure(superAdminActor);

    expect(res.company.name).toBe("Betopia Group");
    expect(res.summary.totalBranches).toBe(2);
    expect(res.summary.totalDepartments).toBe(3);
    expect(res.summary.totalTeams).toBe(1);

    // Verify tree structure
    const rootBranchNode = res.tree.find((n) => n.id === holdingBranch.id);
    expect(rootBranchNode).toBeDefined();
    expect(rootBranchNode?.type).toBe("BRANCH");
    expect(rootBranchNode?.children.length).toBe(1);

    const subBranchNode = rootBranchNode?.children[0];
    expect(subBranchNode?.id).toBe(alphaBranch.id);
    expect(subBranchNode?.type).toBe("BRANCH");
    expect(subBranchNode?.children.length).toBe(1);

    const deptNode = subBranchNode?.children[0];
    expect(deptNode?.id).toBe(engDept.id);
    expect(deptNode?.type).toBe("DEPARTMENT");
    expect(deptNode?.children.length).toBe(1);

    const subDeptNode = deptNode?.children[0];
    expect(subDeptNode?.id).toBe(frontendDept.id);
    expect(subDeptNode?.type).toBe("DEPARTMENT");
    expect(subDeptNode?.children.length).toBe(1);

    const teamNode = subDeptNode?.children[0];
    expect(teamNode?.id).toBe(webTeam.id);
    expect(teamNode?.type).toBe("TEAM");

    // Verify global HQ department is in top-level roots
    const legalNode = res.tree.find((n) => n.id === legalDept.id);
    expect(legalNode).toBeDefined();
    expect(legalNode?.type).toBe("DEPARTMENT");
    expect(legalNode?.branchId).toBeNull();
  });
});
