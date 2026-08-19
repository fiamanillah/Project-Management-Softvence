// src/Modules/Organization/services/organization.structure.service.ts

import type { PrismaClient } from "@workspace/db";
import { AppLogger } from "@/core/logging/logger";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  UnifiedOrgNode,
  OrganizationStructureResponse,
} from "../OrganizationDTO";

export class OrganizationStructureService {
  private logger = new AppLogger("OrganizationStructureService");

  constructor(private readonly prisma: PrismaClient) {}

  public async getOrganizationStructure(actor?: AuthenticatedUser): Promise<OrganizationStructureResponse> {
    // 1. Fetch all non-deleted entities concurrently
    const [branches, departments, teams] = await Promise.all([
      this.prisma.branch.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          parent: { select: { id: true, code: true, name: true } },
          managers: {
            where: { unassignedAt: null },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          _count: { select: { subBranches: true, departments: true } },
        },
      }),
      this.prisma.department.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          parent: { select: { id: true, code: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
          managers: {
            where: { unassignedAt: null },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          _count: { select: { designations: true, teams: true, subDepartments: true } },
        },
      }),
      this.prisma.team.findMany({
        where: {},
        orderBy: { name: "asc" },
        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
              branchId: true,
            },
          },
          members: {
            where: { leftAt: null },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          _count: { select: { members: true } },
        },
      }),
    ]);

    // 2. Pre-compute capabilities for branches
    const branchNodesMap = new Map<string, UnifiedOrgNode>();
    for (const b of branches) {
      const [canEdit, canDelete, canManage, canAddDept] = actor
        ? await Promise.all([
            can(actor, "organization.branch.manage", { branchId: b.id }),
            can(actor, "organization.branch.delete", { branchId: b.id }),
            can(actor, "organization.branch.manage", { branchId: b.id }),
            can(actor, "organization.department.manage", { branchId: b.id }),
          ])
        : [true, true, true, true];

      const node: UnifiedOrgNode = {
        id: b.id,
        type: "BRANCH",
        code: b.code,
        name: b.name,
        description: b.description,
        parentId: b.parentId,
        parentType: b.parentId ? "BRANCH" : null,
        parentName: b.parent?.name || null,
        branchId: b.id,
        branchName: b.name,
        departmentId: null,
        departmentName: null,
        isActive: b.isActive,
        email: b.email,
        phone: b.phone,
        address: b.address,
        managers: b.managers.map((m) => ({
          id: m.id,
          userId: m.userId,
          fullName: `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim() || m.user?.email || "Manager",
          email: m.user?.email || "",
        })),
        counts: {
          subBranches: b._count.subBranches,
          departments: b._count.departments,
        },
        children: [],
        _capabilities: {
          canEdit,
          canDelete,
          canAssignManager: canManage,
          canAddSubBranch: canManage,
          canAddDepartment: canAddDept,
          canAddSubDepartment: false,
          canAddTeam: false,
        },
      };

      branchNodesMap.set(b.id, node);
    }

    // 3. Pre-compute capabilities for departments
    const deptNodesMap = new Map<string, UnifiedOrgNode>();
    for (const d of departments) {
      const [canEdit, canDelete, canManage, canAddSub, canAddTeam] = actor
        ? await Promise.all([
            can(actor, "organization.department.manage", { departmentId: d.id, branchId: d.branchId || undefined }),
            can(actor, "organization.department.delete", { departmentId: d.id, branchId: d.branchId || undefined }),
            can(actor, "organization.department.manage", { departmentId: d.id, branchId: d.branchId || undefined }),
            can(actor, "organization.department.manage", { departmentId: d.id, branchId: d.branchId || undefined }),
            can(actor, "organization.team.manage", { departmentId: d.id, branchId: d.branchId || undefined }),
          ])
        : [true, true, true, true, true];

      const node: UnifiedOrgNode = {
        id: d.id,
        type: "DEPARTMENT",
        code: d.code,
        name: d.name,
        parentId: d.parentId,
        parentType: d.parentId ? "DEPARTMENT" : d.branchId ? "BRANCH" : null,
        parentName: d.parent?.name || d.branch?.name || null,
        branchId: d.branchId,
        branchName: d.branch?.name || null,
        departmentId: d.id,
        departmentName: d.name,
        isActive: d.isActive,
        managers: d.managers.map((m) => ({
          id: m.id,
          userId: m.userId,
          fullName: `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim() || m.user?.email || "Manager",
          email: m.user?.email || "",
        })),
        counts: {
          subDepartments: d._count.subDepartments,
          teams: d._count.teams,
          designations: d._count.designations,
        },
        children: [],
        _capabilities: {
          canEdit,
          canDelete,
          canAssignManager: canManage,
          canAddSubBranch: false,
          canAddDepartment: false,
          canAddSubDepartment: canAddSub,
          canAddTeam,
        },
      };

      deptNodesMap.set(d.id, node);
    }

    // 4. Pre-compute capabilities for teams
    const teamNodesMap = new Map<string, UnifiedOrgNode>();
    for (const t of teams) {
      const [canEdit, canDelete, canManage] = actor
        ? await Promise.all([
            can(actor, "organization.team.manage", { teamId: t.id, departmentId: t.departmentId }),
            can(actor, "organization.team.delete", { teamId: t.id, departmentId: t.departmentId }),
            can(actor, "organization.team.manage", { teamId: t.id, departmentId: t.departmentId }),
          ])
        : [true, true, true];

      const leadMember = t.members[0];

      const node: UnifiedOrgNode = {
        id: t.id,
        type: "TEAM",
        code: t.slug || t.name,
        name: t.name,
        description: null,
        parentId: t.departmentId,
        parentType: "DEPARTMENT",
        parentName: t.department?.name || null,
        branchId: t.department?.branchId || null,
        departmentId: t.departmentId,
        departmentName: t.department?.name || null,
        isActive: t.isActive,
        teamLead: leadMember
          ? {
              id: leadMember.id,
              userId: leadMember.userId,
              fullName: `${leadMember.user?.firstName || ""} ${leadMember.user?.lastName || ""}`.trim() || leadMember.user?.email || "Lead",
              email: leadMember.user?.email || "",
            }
          : null,
        counts: {
          members: t._count.members,
        },
        children: [],
        _capabilities: {
          canEdit,
          canDelete,
          canAssignManager: canManage,
          canAddSubBranch: false,
          canAddDepartment: false,
          canAddSubDepartment: false,
          canAddTeam: false,
        },
      };

      teamNodesMap.set(t.id, node);
    }

    // 5. Build recursive nesting
    // A) Nest teams inside their parent departments
    teams.forEach((t) => {
      const teamNode = teamNodesMap.get(t.id);
      const parentDeptNode = deptNodesMap.get(t.departmentId);
      if (teamNode && parentDeptNode) {
        parentDeptNode.children.push(teamNode);
      }
    });

    // B) Nest sub-departments inside their parent departments
    departments.forEach((d) => {
      if (d.parentId) {
        const childDeptNode = deptNodesMap.get(d.id);
        const parentDeptNode = deptNodesMap.get(d.parentId);
        if (childDeptNode && parentDeptNode) {
          parentDeptNode.children.push(childDeptNode);
        }
      }
    });

    // C) Nest root departments inside their host branch (or keep as HQ root if branchId is null)
    const rootNodes: UnifiedOrgNode[] = [];

    departments.forEach((d) => {
      // If it's a root department (not a sub-dept)
      if (!d.parentId) {
        const deptNode = deptNodesMap.get(d.id);
        if (deptNode) {
          if (d.branchId && branchNodesMap.has(d.branchId)) {
            const hostBranch = branchNodesMap.get(d.branchId)!;
            hostBranch.children.push(deptNode);
          } else {
            // Global HQ department
            rootNodes.push(deptNode);
          }
        }
      }
    });

    // D) Nest sub-branches inside their parent branches
    branches.forEach((b) => {
      const branchNode = branchNodesMap.get(b.id);
      if (branchNode) {
        if (b.parentId && branchNodesMap.has(b.parentId)) {
          const parentBranch = branchNodesMap.get(b.parentId)!;
          parentBranch.children.push(branchNode);
        } else {
          // Top-level Enterprise Branch
          rootNodes.push(branchNode);
        }
      }
    });

    // Sort top-level roots
    rootNodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "BRANCH" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate unique leadership count
    const uniqueLeadershipUserIds = new Set<string>();
    branches.forEach((b) => b.managers.forEach((m) => uniqueLeadershipUserIds.add(m.userId)));
    departments.forEach((d) => d.managers.forEach((m) => uniqueLeadershipUserIds.add(m.userId)));

    return {
      company: {
        name: "Betopia Group",
        code: "BETOPIA",
        description: "Enterprise Multi-Branch Corporate Holding",
      },
      tree: rootNodes,
      summary: {
        totalBranches: branches.length,
        activeBranches: branches.filter((b) => b.isActive).length,
        totalDepartments: departments.length,
        activeDepartments: departments.filter((d) => d.isActive).length,
        totalTeams: teams.length,
        activeTeams: teams.filter((t) => t.isActive).length,
        totalLeadership: uniqueLeadershipUserIds.size,
      },
    };
  }
}
