import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100, "Team name cannot exceed 100 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug cannot exceed 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
  departmentId: z.string().uuid("Invalid department ID format"),
  shift: z.string().max(50, "Shift description is too long").optional().nullable(),
  isActive: z.boolean().optional().default(true),
  initialMembers: z
    .array(
      z.object({
        userId: z.string().uuid("Invalid user ID"),
        roleId: z.string().uuid("Invalid assignment role ID"),
        note: z.string().max(255).optional().nullable(),
      }),
    )
    .optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
  departmentId: z.string().uuid("Invalid department ID format").optional(),
  shift: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  roleId: z.string().uuid("Invalid assignment role ID format"),
  note: z.string().max(255, "Note cannot exceed 255 characters").optional().nullable(),
});

export const updateTeamMemberSchema = z.object({
  roleId: z.string().uuid("Invalid assignment role ID format").optional(),
  note: z.string().max(255, "Note cannot exceed 255 characters").optional().nullable(),
});

export type CreateTeamDTO = z.infer<typeof createTeamSchema>;
export type UpdateTeamDTO = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberDTO = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberDTO = z.infer<typeof updateTeamMemberSchema>;

export interface AssignmentRoleItem {
  id: string;
  code: string;
  name: string;
  qualifiesForTeamScope: boolean;
  isActive: boolean;
  createdAt?: string | Date;
}

export interface TeamMemberItem {
  id: string;
  teamId: string;
  userId: string;
  roleId: string;
  joinedAt: string | Date;
  leftAt?: string | Date | null;
  note?: string | null;
  user: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    systemRole: string;
    isActive: boolean;
    designation?: {
      id: string;
      code: string;
      name: string;
      hierarchyLevel?: number;
      department?: {
        id: string;
        code: string;
        name: string;
      } | null;
    } | null;
  };
  role: {
    id: string;
    code: string;
    name: string;
    qualifiesForTeamScope: boolean;
  };
}

export interface TeamCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
}

export interface TeamItem {
  id: string;
  departmentId: string;
  name: string;
  slug: string;
  shift: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  department: {
    id: string;
    code: string;
    name: string;
  };
  members?: TeamMemberItem[];
  leads?: TeamMemberItem[];
  _count?: {
    members: number;
    projectAssignments: number;
    bdOrders: number;
  };
  _capabilities?: TeamCapabilities;
}

export interface TeamDetailItem extends TeamItem {
  activeMembers: TeamMemberItem[];
  pastMembers: TeamMemberItem[];
  projectAssignments?: Array<{
    id: string;
    projectId: string;
    assignedAt: string | Date;
    unassignedAt?: string | Date | null;
    project: {
      id: string;
      projectName: string;
      orderId: string;
    };
  }>;
}

export interface TeamStats {
  totalTeams: number;
  activeTeams: number;
  totalMembers: number;
  totalDepartmentsRepresented: number;
}
