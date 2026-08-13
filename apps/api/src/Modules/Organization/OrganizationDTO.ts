// src/Modules/Organization/OrganizationDTO.ts

import { z } from "zod";

export const createDepartmentSchema = z.object({
  code: z.string().min(2, "Code is required").toUpperCase(),
  name: z.string().min(2, "Name is required"),
  isActive: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  isActive: z.boolean().optional(),
});

export const assignDepartmentManagerSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const createDesignationSchema = z.object({
  code: z.string().min(2, "Code is required").toUpperCase(),
  name: z.string().min(2, "Name is required"),
  departmentId: z.string().uuid("Invalid department ID"),
  hierarchyLevel: z.number().int().min(1).default(3),
  isLeadership: z.boolean().default(false),
});

export const permissionAssignmentItemSchema = z.object({
  permissionId: z.string().uuid(),
  scopeTypeId: z.string().uuid(),
  targetDepartmentIds: z.array(z.string().uuid()).optional(),
  targetTeamIds: z.array(z.string().uuid()).optional(),
  targetProjectIds: z.array(z.string().uuid()).optional(),
});

export const savePermissionAssignmentsSchema = z.object({
  assignments: z.array(permissionAssignmentItemSchema),
});

export type CreateDepartmentDTO = z.input<typeof createDepartmentSchema>;
export type UpdateDepartmentDTO = z.infer<typeof updateDepartmentSchema>;
export type AssignDepartmentManagerDTO = z.infer<typeof assignDepartmentManagerSchema>;
export type CreateDesignationDTO = z.infer<typeof createDesignationSchema>;
export type SavePermissionAssignmentsDTO = z.infer<typeof savePermissionAssignmentsSchema>;
