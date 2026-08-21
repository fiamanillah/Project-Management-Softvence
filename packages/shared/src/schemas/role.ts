import { z } from "zod";

export const SCOPE_WEIGHTS: Record<string, number> = {
  Global: 50,
  GLOBAL: 50,
  ExplicitBranches: 40,
  EXPLICIT_BRANCHES: 40,
  OwnBranch: 40,
  OWN_BRANCH: 40,
  ExplicitDepartments: 30,
  EXPLICIT_DEPARTMENTS: 30,
  OwnDepartment: 30,
  OWN_DEPARTMENT: 30,
  ExplicitTeams: 20,
  EXPLICIT_TEAMS: 20,
  OwnTeam: 20,
  OWN_TEAM: 20,
  ExplicitProjects: 10,
  EXPLICIT_PROJECTS: 10,
  OwnProject: 10,
  OWN_PROJECT: 10,
  OwnProfile: 10,
  OWN_PROFILE: 10,
  None: 0,
  NONE: 0,
};

export function getScopeWeight(strategyOrCode?: string | null): number {
  if (!strategyOrCode) return 0;
  return SCOPE_WEIGHTS[strategyOrCode] ?? 0;
}

export const permissionAssignmentItemSchema = z.object({
  permissionId: z.string().uuid("Invalid permission ID"),
  scopeTypeId: z.string().uuid("Invalid scope type ID"),
  targetBranchIds: z.array(z.string().uuid()).optional(),
  targetDepartmentIds: z.array(z.string().uuid()).optional(),
  targetTeamIds: z.array(z.string().uuid()).optional(),
  targetProjectIds: z.array(z.string().uuid()).optional(),
});

export const createRoleSchema = z.object({
  code: z.string().min(2, "Code is required").transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required"),
  description: z.string().optional().nullable(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  hierarchyLevel: z.number().int().min(1).default(1),
  isLeadership: z.boolean().default(false),
  isActive: z.boolean().default(true),
  assignments: z.array(permissionAssignmentItemSchema).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  description: z.string().optional().nullable(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  hierarchyLevel: z.number().int().min(1).max(10).optional(),
  isLeadership: z.boolean().optional(),
  isActive: z.boolean().optional(),
  assignments: z.array(permissionAssignmentItemSchema).optional(),
});

export const saveRolePermissionsSchema = z.object({
  assignments: z.array(permissionAssignmentItemSchema),
});

export type PermissionAssignmentItem = z.infer<typeof permissionAssignmentItemSchema>;
export type CreateRoleDTO = z.input<typeof createRoleSchema>;
export type UpdateRoleDTO = z.infer<typeof updateRoleSchema>;
export type SaveRolePermissionsDTO = z.infer<typeof saveRolePermissionsSchema>;

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  hierarchyLevel: number;
  isLeadership: boolean;
  isActive: boolean;
  createdAt?: string | Date;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: {
    users: number;
    permissions: number;
  };
  _capabilities?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canManagePermissions?: boolean;
  };
}

export interface RoleDetailItem extends RoleItem {
  permissions: {
    id: string;
    roleId: string;
    permissionId: string;
    scopeTypeId: string;
    isActive: boolean;
    permission: {
      id: string;
      code: string;
      description?: string | null;
      module?: string | null;
      supportedScopes: string[];
    };
    scopeType: {
      id: string;
      code: string;
      name: string;
      resolutionStrategy: string;
    };
    scopeTargets: {
      id: string;
      branchId?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
      projectId?: string | null;
      branch?: { id: string; code: string; name: string } | null;
      department?: { id: string; code: string; name: string } | null;
      team?: { id: string; name: string } | null;
      project?: { id: string; projectName: string } | null;
    }[];
  }[];
}
