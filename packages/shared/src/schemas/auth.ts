import { z } from "zod";

export const createUserBodySchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

export const createUserSchema = {
  body: createUserBodySchema,
};

export type CreateUserDTO = z.infer<typeof createUserBodySchema>;

export const loginUserBodySchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const loginUserSchema = {
  body: loginUserBodySchema,
};

export type LoginUserDTO = z.infer<typeof loginUserBodySchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().optional(),
});

export const refreshSchema = {
  body: refreshBodySchema,
};

export type RefreshDTO = z.infer<typeof refreshBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPasswordSchema = {
  body: forgotPasswordBodySchema,
};

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPasswordSchema = {
  body: resetPasswordBodySchema,
};

export type ResetPasswordDTO = z.infer<typeof resetPasswordBodySchema>;

export const authResponseDataSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    systemRole: z.string(),
    designationId: z.string(),
  }),
  accessToken: z.string().optional(),
});

export type AuthResponseData = z.infer<typeof authResponseDataSchema>;
