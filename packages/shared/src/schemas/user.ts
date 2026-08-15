import { z } from "zod";

export const userRoleEnum = z.enum(["admin", "user"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const accountStatusEnum = z.enum([
  "active",
  "inactive",
  "suspended",
  "pending_verification",
]);
export type AccountStatus = z.infer<typeof accountStatusEnum>;

export const userStatusEnum = z.enum([
  "INVITED",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "LOCKED",
  "ARCHIVED",
]);
export type UserStatus = z.infer<typeof userStatusEnum>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable().optional(),
  role: userRoleEnum,
  status: userStatusEnum.default("INVITED"),
  emailVerifiedAt: z.date().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isDeleted: z.boolean(),
  isActive: z.boolean().default(true),
  mustChangePassword: z.boolean().default(true),
  lastLoginAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export type UserProfile = z.infer<typeof userSchema>;

export const userWithoutPasswordSchema = userSchema;
export type UserWithoutPassword = z.infer<typeof userWithoutPasswordSchema>;

export const createAdminUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  employeeId: z.string().trim().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]).default("Staff"),
  designationId: z.string().uuid("Invalid designation ID"),
  sendInviteEmail: z.boolean().default(true).optional(),
});

export const resendInviteSchema = z.object({
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const updateAdminUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  employeeId: z.string().min(1, "Employee ID cannot be empty").optional(),
  systemRole: z.enum(["SuperAdmin", "Admin", "Staff"]).optional(),
  designationId: z.string().uuid("Invalid designation ID").optional(),
  isActive: z.boolean().optional(),
  status: userStatusEnum.optional(),
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

export const createDelegationSchema = z
  .object({
    delegatorId: z.string().uuid("Invalid delegator ID"),
    delegateeId: z.string().uuid("Invalid delegatee ID"),
    scope: z.string().default("*"),
    validFrom: z.string().min(1, "Valid start date is required"),
    validUntil: z.string().min(1, "Valid end date is required"),
  })
  .refine((data) => data.delegatorId !== data.delegateeId, {
    message: "Delegator and delegatee cannot be the same user",
    path: ["delegateeId"],
  })
  .refine(
    (data) => {
      const from = new Date(data.validFrom).getTime();
      const until = new Date(data.validUntil).getTime();
      return !isNaN(from) && !isNaN(until) && until >= from;
    },
    {
      message: "Expiry date must be on or after start date",
      path: ["validUntil"],
    },
  );

export type CreateAdminUserDTO = z.infer<typeof createAdminUserSchema>;
export type ResendInviteDTO = z.infer<typeof resendInviteSchema>;
export type UpdateAdminUserDTO = z.infer<typeof updateAdminUserSchema>;
export type CreateOverrideDTO = z.infer<typeof createOverrideSchema>;
export type CreateDelegationDTO = z.infer<typeof createDelegationSchema>;


