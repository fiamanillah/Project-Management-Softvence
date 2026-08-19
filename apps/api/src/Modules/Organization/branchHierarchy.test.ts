// src/Modules/Organization/branchHierarchy.test.ts

import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { OrganizationService } from "./organization.service";
import { ScopeEvaluator } from "@/core/authorization/ScopeEvaluator";
import type { AuthenticatedUser, ResolvedRoleGrant } from "@/core/authorization/authorization.types";

describe("Branch Hierarchy & Betopia Group Multi-Branch Scoping", () => {
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
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.branch.deleteMany({});
  };

  beforeEach(async () => {
    orgService = new OrganizationService(prisma);
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it("should create a root branch and nested sub-branches", async () => {
    const parentHolding = await orgService.createBranch({
      code: "BET-HQ",
      name: "Betopia Group",
      description: "Holding enterprise parent",
    });

    expect(parentHolding.id).toBeDefined();
    expect(parentHolding.parentId).toBeNull();

    const softvenceAlpha = await orgService.createBranch({
      code: "BET-SA",
      name: "Softvence Alpha",
      parentId: parentHolding.id,
      description: "Flagship software branch",
    });

    expect(softvenceAlpha.id).toBeDefined();
    expect(softvenceAlpha.parentId).toBe(parentHolding.id);

    const dhakaHub = await orgService.createBranch({
      code: "BET-SA-DHAKA",
      name: "Softvence Alpha - Dhaka Hub",
      parentId: softvenceAlpha.id,
      description: "R&D Sub-branch",
    });

    expect(dhakaHub.id).toBeDefined();
    expect(dhakaHub.parentId).toBe(softvenceAlpha.id);

    const branches = await orgService.getBranches();
    expect(branches.length).toBe(3);

    const descendants = await orgService.getBranchDescendantIds(parentHolding.id);
    expect(descendants).toContain(softvenceAlpha.id);
    expect(descendants).toContain(dhakaHub.id);
  });

  it("should prevent circular hierarchy / cycle detection on branch updates", async () => {
    const root = await orgService.createBranch({
      code: "BET-ROOT",
      name: "Root Branch",
    });

    const child = await orgService.createBranch({
      code: "BET-CHILD",
      name: "Child Branch",
      parentId: root.id,
    });

    const grandChild = await orgService.createBranch({
      code: "BET-GRANDCHILD",
      name: "Grandchild Branch",
      parentId: child.id,
    });

    // 1. Cannot self-parent
    expect(
      orgService.updateBranch(root.id, {
        parentId: root.id,
      }),
    ).rejects.toThrow("A branch cannot be its own parent.");

    // 2. Cannot parent root to grandchild (circular loop)
    expect(
      orgService.updateBranch(root.id, {
        parentId: grandChild.id,
      }),
    ).rejects.toThrow("circular hierarchy detected");
  });

  it("should assign and remove branch managers", async () => {
    const branch = await orgService.createBranch({
      code: "BET-UK",
      name: "Betopia London",
    });

    const user = await prisma.user.create({
      data: {
        email: "london.manager@betopia.com",
        employeeId: "UK-001",
        firstName: "William",
        lastName: "Smith",
        passwordHash: "hash",
        systemRole: "Staff",
      },
    });

    const manager = await orgService.assignBranchManager(branch.id, {
      userId: user.id,
    });

    expect(manager.id).toBeDefined();
    expect(manager.branchId).toBe(branch.id);
    expect(manager.userId).toBe(user.id);

    const branchDetail = await orgService.getBranchById(branch.id);
    expect(branchDetail.managers?.length).toBe(1);
    expect(branchDetail.managers?.[0].user.email).toBe("london.manager@betopia.com");

    const removeRes = await orgService.removeBranchManager(branch.id, manager.id);
    expect(removeRes.message).toBe("Branch manager removed successfully");

    const activeManagers = await prisma.branchManager.findMany({
      where: { branchId: branch.id, unassignedAt: null },
    });
    expect(activeManagers.length).toBe(0);
  });

  it("should evaluate OwnBranch scope resolution correctly", async () => {
    const parentHolding = await orgService.createBranch({
      code: "BET-HQ",
      name: "Betopia Group",
    });

    const saBranch = await orgService.createBranch({
      code: "BET-SA",
      name: "Softvence Alpha",
      parentId: parentHolding.id,
    });

    const otherBranch = await orgService.createBranch({
      code: "BET-OTHER",
      name: "Other Sister Company",
      parentId: parentHolding.id,
    });

    const dept = await orgService.createDepartment({
      code: "ENG",
      name: "Engineering",
      branchId: saBranch.id,
    });

    const user = await prisma.user.create({
      data: {
        email: "engineer@softvence.com",
        employeeId: "ENG-001",
        firstName: "Alice",
        lastName: "Dev",
        passwordHash: "hash",
        systemRole: "Staff",
        branchId: saBranch.id,
      },
    });

    const perm = await prisma.permission.upsert({
      where: { code: "projects.project.view" },
      update: { supportedScopes: ["Global", "OwnBranch", "ExplicitBranches"] },
      create: {
        code: "projects.project.view",
        module: "Projects",
        supportedScopes: ["Global", "OwnBranch", "ExplicitBranches"],
        isActive: true,
      },
    });

    const grant: ResolvedRoleGrant = {
      permissionCode: "projects.project.view",
      permissionId: perm.id,
      resolutionStrategy: "OwnBranch",
      scopeTargets: {
        branchIds: [],
        departmentIds: [],
        teamIds: [],
        projectIds: [],
      },
    };

    const actor: AuthenticatedUser = {
      id: user.id,
      systemRole: "Staff",
      roleId: "",
      branchId: saBranch.id,
      email: user.email,
    };

    // 1. Should ALLOW access to resources in the user's branch
    const allowedInBranch = await ScopeEvaluator.evaluate(
      actor,
      grant,
      { branchId: saBranch.id },
      prisma,
    );
    expect(allowedInBranch).toBe(true);

    // 2. Should ALLOW access to department under the user's branch
    const allowedInDept = await ScopeEvaluator.evaluate(
      actor,
      grant,
      { departmentId: dept.id },
      prisma,
    );
    expect(allowedInDept).toBe(true);

    // 3. Should DENY access to resources in a different sibling branch
    const deniedInOtherBranch = await ScopeEvaluator.evaluate(
      actor,
      grant,
      { branchId: otherBranch.id },
      prisma,
    );
    expect(deniedInOtherBranch).toBe(false);
  });
});
