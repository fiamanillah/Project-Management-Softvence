import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "./requirePermission";
import { getUserPermissions } from "@/core/authorization/AuthorizationEngine";
import type { Request, Response } from "express";

describe("API & Middleware Shape (Section 5)", () => {
  let testDepartmentId: string;
  let testRoleId: string;
  let testPermissionId: string;
  let testUserId: string;

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
    await prisma.projectMessageRevision.deleteMany({});
    await prisma.projectMessageReadReceipt.deleteMany({});
    await prisma.projectMessageReaction.deleteMany({});
    await prisma.projectMessageAttachment.deleteMany({});
    await prisma.approvalStageAudit.deleteMany({});
    await prisma.messageApprovalWorkflow.deleteMany({});
    await prisma.projectMessage.deleteMany({});
    await prisma.projectMilestone.deleteMany({});
    await prisma.projectLink.deleteMany({});
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
    await prisma.permission.deleteMany({});
    await prisma.permissionScopeType.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.designation.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.branch.deleteMany({});
  };

  beforeEach(async () => {
    await cleanDatabase();

    const dept = await prisma.department.create({
      data: { code: "FINANCE", name: "Finance Dept" },
    });
    testDepartmentId = dept.id;

    const role = await prisma.role.create({
      data: {
        code: "FINANCE_ANALYST",
        name: "Financial Analyst",
        departmentId: testDepartmentId,
        hierarchyLevel: 2,
      },
    });
    testRoleId = role.id;

    const user = await prisma.user.create({
      data: {
        employeeId: `FIN-${Date.now()}`,
        email: `analyst-${Date.now()}@example.com`,
        passwordHash: "hash",
        firstName: "Financial",
        lastName: "User",
        systemRole: "Staff",
        roleId: testRoleId,
      },
    });
    testUserId = user.id;

    const perm = await prisma.permission.create({
      data: {
        code: "billing.view",
        module: "Billing",
        description: "View financial billing invoices",
        isActive: true,
      },
    });
    testPermissionId = perm.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it("requirePermission should return fixed generic 403 message without information disclosure", async () => {
    const req: any = {
      user: {
        sub: testUserId,
        systemRole: "Staff",
        roleId: testRoleId,
      },
      headers: {},
      socket: {},
    };

    let errPassed: any = null;
    const middleware = requirePermission("billing.view");

    await middleware(req, {} as Response, (err?: any) => {
      errPassed = err;
    });

    expect(errPassed).toBeDefined();
    expect(errPassed?.statusCode).toBe(403);
    expect(errPassed?.message).toBe("You don't have access to this resource");
    // Ensure no internal scope details are leaked in message
    expect(errPassed?.message).not.toContain("Billing");
    expect(errPassed?.message).not.toContain("OwnTeam");
  });

  it("getUserPermissions should return user permission map for frontend UI rendering", async () => {
    // Add active global scope type & grant
    const scopeGlobal = await prisma.permissionScopeType.create({
      data: {
        code: "GLOBAL",
        name: "Global Scope",
        resolutionStrategy: "Global",
      },
    });

    await prisma.rolePermission.create({
      data: {
        roleId: testRoleId,
        permissionId: testPermissionId,
        scopeTypeId: scopeGlobal.id,
        grantedBy: testUserId,
      },
    });

    const userObj = {
      id: testUserId,
      systemRole: "Staff",
      roleId: testRoleId,
    };

    const permMap = await getUserPermissions(userObj);

    expect(permMap["billing.view"]).toBeDefined();
    expect(permMap["billing.view"].allowed).toBe(true);
    expect(permMap["billing.view"].scope).toBe("Global");
    expect(permMap["billing.view"].module).toBe("Billing");
  });
});
