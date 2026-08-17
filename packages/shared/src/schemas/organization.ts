import { z } from "zod";

export const createDepartmentSchema = z.object({
  code: z.string().min(2, "Code is required and must be at least 2 characters").transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  parentId: z.string().uuid("Invalid parent department ID").optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, "Name is required and must be at least 2 characters").optional(),
  parentId: z.string().uuid("Invalid parent department ID").optional().nullable(),
  isActive: z.boolean().optional(),
});

export const assignDepartmentManagerSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

// Clean Designation (HR Job Title / Corporate Tag)
export const createDesignationSchema = z.object({
  code: z.string().min(2, "Code is required").transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required"),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  hierarchyLevel: z.number().int().min(1).default(1),
  isLeadership: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateDesignationSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  hierarchyLevel: z.number().int().min(1).max(10).optional(),
  isLeadership: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentDTO = z.input<typeof createDepartmentSchema>;
export type UpdateDepartmentDTO = z.infer<typeof updateDepartmentSchema>;
export type AssignDepartmentManagerDTO = z.infer<typeof assignDepartmentManagerSchema>;
export type CreateDesignationDTO = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationDTO = z.infer<typeof updateDesignationSchema>;

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
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  parent?: {
    id: string;
    code: string;
    name: string;
  } | null;
  subDepartments?: DepartmentItem[];
  managers?: DepartmentManagerItem[];
  _count?: {
    roles?: number;
    designations: number;
    teams: number;
    subDepartments: number;
  };
}

export interface DesignationItem {
  id: string;
  code: string;
  name: string;
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
  };
}
