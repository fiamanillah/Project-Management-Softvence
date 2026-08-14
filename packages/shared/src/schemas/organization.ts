import { z } from "zod";

export const createDepartmentSchema = z.object({
  code: z.string().min(2, "Code is required and must be at least 2 characters").transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  isActive: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, "Name is required and must be at least 2 characters").optional(),
  isActive: z.boolean().optional(),
});

export const assignDepartmentManagerSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

export const permissionAssignmentItemSchema = z.object({
  permissionId: z.string().uuid(),
  scopeTypeId: z.string().uuid(),
  targetDepartmentIds: z.array(z.string().uuid()).optional(),
  targetTeamIds: z.array(z.string().uuid()).optional(),
  targetProjectIds: z.array(z.string().uuid()).optional(),
});

export const createDesignationSchema = z.object({
  code: z.string().min(2, "Code is required").transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required"),
  departmentId: z.string().uuid("Invalid department ID"),
  hierarchyLevel: z.number().int().min(1).default(3),
  isLeadership: z.boolean().default(false),
  assignments: z.array(permissionAssignmentItemSchema).optional(),
});

export const updateDesignationSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  departmentId: z.string().uuid("Invalid department ID").optional(),
  hierarchyLevel: z.number().int().min(1).max(10).optional(),
  isLeadership: z.boolean().optional(),
  assignments: z.array(permissionAssignmentItemSchema).optional(),
});

export const savePermissionAssignmentsSchema = z.object({
  assignments: z.array(permissionAssignmentItemSchema),
});

export type CreateDepartmentDTO = z.input<typeof createDepartmentSchema>;
export type UpdateDepartmentDTO = z.infer<typeof updateDepartmentSchema>;
export type AssignDepartmentManagerDTO = z.infer<typeof assignDepartmentManagerSchema>;
export type CreateDesignationDTO = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationDTO = z.infer<typeof updateDesignationSchema>;
export type SavePermissionAssignmentsDTO = z.infer<typeof savePermissionAssignmentsSchema>;

export interface DepartmentManagerItem {
  id: string;
  userId: string;
  assignedAt?: string | Date;
  unassignedAt?: string | Date | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  managers?: DepartmentManagerItem[];
  _count?: {
    designations: number;
    teams: number;
  };
}
