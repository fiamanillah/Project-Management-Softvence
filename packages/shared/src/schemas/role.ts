import { z } from "zod";

export const permissionAssignmentItemSchema = z.object({
  permissionId: z.string().uuid("Invalid permission ID"),
  scopeTypeId: z.string().uuid("Invalid scope type ID"),
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
export type CreateRoleDTO = z.infer<typeof createRoleSchema>;
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
      departmentId?: string | null;
      teamId?: string | null;
      projectId?: string | null;
      department?: { id: string; code: string; name: string } | null;
      team?: { id: string; name: string } | null;
      project?: { id: string; projectName: string } | null;
    }[];
  }[];
}
