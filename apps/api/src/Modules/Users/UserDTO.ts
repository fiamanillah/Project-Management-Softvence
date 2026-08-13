// src/Modules/Users/UserDTO.ts

import { z } from "zod";

export const createAdminUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]).default("Staff"),
  designationId: z.string().uuid("Invalid designation ID"),
});

export const updateAdminUserSchema = z.object({
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]).optional(),
  designationId: z.string().uuid("Invalid designation ID").optional(),
  isActive: z.boolean().optional(),
});

export const createOverrideSchema = z.object({
  userId: z.string().uuid(),
  permissionId: z.string().uuid(),
  isDeny: z.boolean().default(false),
  departmentId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const createDelegationSchema = z.object({
  delegatorId: z.string().uuid(),
  delegateeId: z.string().uuid(),
  scope: z.string().default("*"),
  validFrom: z.string(),
  validUntil: z.string(),
});

export type CreateAdminUserDTO = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserDTO = z.infer<typeof updateAdminUserSchema>;
export type CreateOverrideDTO = z.infer<typeof createOverrideSchema>;
export type CreateDelegationDTO = z.infer<typeof createDelegationSchema>;
