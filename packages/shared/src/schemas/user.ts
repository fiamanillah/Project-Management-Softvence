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

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable().optional(),
  role: userRoleEnum,
  status: accountStatusEnum,
  emailVerifiedAt: z.date().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isDeleted: z.boolean(),
  lastLoginAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export type UserProfile = z.infer<typeof userSchema>;

export const userWithoutPasswordSchema = userSchema;
export type UserWithoutPassword = z.infer<typeof userWithoutPasswordSchema>;
