// apps/api/src/Modules/Projects/services/projects.capability.helper.ts

import type { PrismaClient } from "@workspace/db";
import { BadRequestError } from "@/core/errors/AppError";
import { can } from "@/core/authorization/AuthorizationEngine";
import type { AuthenticatedUser } from "@/core/authorization/authorization.types";
import type {
  ProjectItem,
  ProjectDetailItem,
  ProjectCapabilities,
} from "../ProjectDTO";

/**
 * Extracts authorization resource context from a project model.
 */
export function getProjectResourceContext(project: any) {
  const primaryTeamAssignment =
    project.teamAssignments?.find((ta: any) => !ta.unassignedAt) ||
    project.teamAssignments?.[0];
  return {
    projectId: project.id,
    teamId: primaryTeamAssignment?.teamId || primaryTeamAssignment?.team?.id,
    departmentId:
      primaryTeamAssignment?.team?.departmentId ||
      primaryTeamAssignment?.team?.department?.id,
    profileId: project.profileId,
  };
}

/**
 * Generates a unique structured project code/identifier (e.g. PRJ-202608-4821).
 */
export async function generateProjectCode(prisma: PrismaClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PRJ-${year}${month}-`;

  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidateCode = `${prefix}${randomSuffix}`;
    const existing = await prisma.project.findFirst({
      where: { projectName: candidateCode },
      select: { id: true },
    });
    if (!existing) {
      return candidateCode;
    }
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Validates that setting targetParentId does not create a circular dependency in project hierarchy.
 */
export async function validateHierarchyNoCycles(
  prisma: PrismaClient,
  projectId: string,
  targetParentId: string,
): Promise<void> {
  if (projectId === targetParentId) {
    throw new BadRequestError("A project cannot be its own parent");
  }

  let currentParentId: string | null = targetParentId;
  const visited = new Set<string>([projectId]);

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new BadRequestError("Circular hierarchy reference detected in project parent hierarchy");
    }
    visited.add(currentParentId);

    const parent: { parentId: string | null } | null = await prisma.project.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    currentParentId = parent?.parentId || null;
  }
}

/**
 * Evaluates scoped permissions for a project and generates its _capabilities map.
 */
export async function computeProjectCapabilities(
  project: any,
  actor: AuthenticatedUser,
): Promise<ProjectCapabilities> {
  const resourceContext = getProjectResourceContext(project);

  const [
    canEdit,
    canDelete,
    canReassign,
    canManageMembers,
    canManageComponents,
    canViewClient,
    canViewFinancials,
    canEditFinancials,
  ] = await Promise.all([
    can(actor, "project.edit", resourceContext),
    can(actor, "project.delete", resourceContext),
    can(actor, "project.reassign", resourceContext),
    can(actor, "project.manage_members", resourceContext),
    can(actor, "project.component.manage", resourceContext),
    can(actor, "project.client.view", resourceContext),
    can(actor, "project.financial.view", resourceContext),
    can(actor, "project.financial.edit", resourceContext),
  ]);

  return {
    canEdit,
    canDelete,
    canReassign,
    canManageMembers,
    canManageComponents,
    canViewClient,
    canViewFinancials,
    canEditFinancials,
  };
}

/**
 * Sanitizes sensitive fields and decorates projects with server-side _capabilities.
 */
export async function sanitizeAndDecorateProject(
  project: any,
  actor: AuthenticatedUser,
): Promise<ProjectItem> {
  const capabilities = await computeProjectCapabilities(project, actor);
  const { canViewClient, canViewFinancials } = capabilities;

  const sanitized: any = {
    ...project,
    value: canViewFinancials ? (project.value !== null ? Number(project.value) : 0) : null,
    amount: canViewFinancials
      ? project.amount !== null && project.amount !== undefined
        ? Number(project.amount)
        : null
      : null,
    percentage: canViewFinancials
      ? project.percentage !== null && project.percentage !== undefined
        ? Number(project.percentage)
        : null
      : null,
    orderSheetUrl: canViewFinancials ? project.orderSheetUrl : null,
    email: canViewClient ? project.email : null,
    clientId: canViewClient ? project.clientId : null,
    client: canViewClient ? project.client : null,
    profileId: canViewClient ? project.profileId : null,
    profile: canViewClient
      ? project.profile
      : project.profile
        ? {
            ...project.profile,
            username: "Confidential Profile",
            platform: project.profile.platform ? { name: project.profile.platform.name } : undefined,
          }
        : null,
    _capabilities: capabilities,
  };

  if (Array.isArray(project.subProjects)) {
    sanitized.subProjects = await Promise.all(
      project.subProjects.map((sp: any) => sanitizeAndDecorateProject(sp, actor)),
    );
  }

  return sanitized as ProjectItem;
}
