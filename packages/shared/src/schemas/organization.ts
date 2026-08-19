import { z } from "zod";

// ==========================================
// BRANCH SCHEMAS & INTERFACES
// ==========================================

export const createBranchSchema = z.object({
  code: z
    .string()
    .min(2, "Code is required and must be at least 2 characters")
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  parentId: z.string().uuid("Invalid parent branch ID").optional().nullable(),
  description: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  logoUrl: z.string().url("Invalid URL").optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2, "Name is required and must be at least 2 characters").optional(),
  parentId: z.string().uuid("Invalid parent branch ID").optional().nullable(),
  description: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  logoUrl: z.string().url("Invalid URL").optional().nullable(),
  isActive: z.boolean().optional(),
});

export const assignBranchManagerSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

export type CreateBranchDTO = z.input<typeof createBranchSchema>;
export type UpdateBranchDTO = z.infer<typeof updateBranchSchema>;
export type AssignBranchManagerDTO = z.infer<typeof assignBranchManagerSchema>;

export interface BranchManagerItem {
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

export interface BranchCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignManager?: boolean;
  canCreateSubBranch?: boolean;
}

export interface BranchItem {
  id: string;
  parentId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date | null;
  parent?: {
    id: string;
    code: string;
    name: string;
  } | null;
  subBranches?: BranchItem[];
  managers?: BranchManagerItem[];
  departments?: DepartmentItem[];
  _count?: {
    departments: number;
    subBranches: number;
    users?: number;
    projects?: number;
  };
  _capabilities?: BranchCapabilities;
}

export interface BranchStats {
  totalBranches: number;
  activeBranches: number;
  totalDepartments: number;
  totalSisterCompanies: number;
}

export type BranchWithCapabilities = BranchItem;

// ==========================================
// DEPARTMENT SCHEMAS & INTERFACES
// ==========================================

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .min(2, "Code is required and must be at least 2 characters")
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  branchId: z.string().uuid("Invalid branch ID format").optional().nullable(),
  parentId: z.string().uuid("Invalid parent department ID").optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, "Name is required and must be at least 2 characters").optional(),
  branchId: z.string().uuid("Invalid branch ID format").optional().nullable(),
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
export type CreateDesignationDTO = z.input<typeof createDesignationSchema>;
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

export interface DepartmentCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignManager?: boolean;
}

export interface DepartmentItem {
  id: string;
  branchId?: string | null;
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date | null;
  branch?: {
    id: string;
    code: string;
    name: string;
  } | null;
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
  _capabilities?: DepartmentCapabilities;
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
  _capabilities?: {
    canEdit?: boolean;
    canDelete?: boolean;
  };
}

// ==========================================
// UNIFIED ENTERPRISE STRUCTURE INTERFACES
// ==========================================

export type OrgNodeType = "BRANCH" | "DEPARTMENT" | "TEAM";

export interface UnifiedOrgNode {
  id: string;
  type: OrgNodeType;
  code: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  parentType?: OrgNodeType | null;
  parentName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  isActive: boolean;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  managers?: Array<{
    id: string;
    userId: string;
    fullName: string;
    email: string;
  }>;
  teamLead?: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
  } | null;
  counts: {
    subBranches?: number;
    departments?: number;
    subDepartments?: number;
    teams?: number;
    designations?: number;
    members?: number;
  };
  children: UnifiedOrgNode[];
  _capabilities: {
    canEdit: boolean;
    canDelete: boolean;
    canAssignManager: boolean;
    canAddSubBranch: boolean;
    canAddDepartment: boolean;
    canAddSubDepartment: boolean;
    canAddTeam: boolean;
  };
}

export interface OrganizationStructureResponse {
  company: {
    name: string;
    code: string;
    description?: string;
  };
  tree: UnifiedOrgNode[];
  summary: {
    totalBranches: number;
    activeBranches: number;
    totalDepartments: number;
    activeDepartments: number;
    totalTeams: number;
    activeTeams: number;
    totalLeadership: number;
  };
}

