import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(
    /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    "Password must contain at least one number or special symbol"
  );

export const createUserBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  password: strongPasswordSchema,
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

export const createUserSchema = {
  body: createUserBodySchema,
};

export type CreateUserDTO = z.infer<typeof createUserBodySchema>;

export const loginUserBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
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
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

export const forgotPasswordSchema = {
  body: forgotPasswordBodySchema,
};

export type ForgotPasswordDTO = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: strongPasswordSchema,
});

export const resetPasswordSchema = {
  body: resetPasswordBodySchema,
};

export type ResetPasswordDTO = z.infer<typeof resetPasswordBodySchema>;

export const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormDTO = z.infer<typeof resetPasswordFormSchema>;

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
});

export const changePasswordSchema = {
  body: changePasswordBodySchema,
};

export type ChangePasswordDTO = z.infer<typeof changePasswordBodySchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current/temporary password is required"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current temporary password",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormDTO = z.infer<typeof changePasswordFormSchema>;

export const authResponseDataSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    systemRole: z.string(),
    roleId: z.string().optional().nullable(),
    designationId: z.string().optional().nullable(),
    role: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    }).optional().nullable(),
    designation: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    }).optional().nullable(),
    mustChangePassword: z.boolean().optional(),
  }),
  accessToken: z.string().optional(),
});

export type AuthResponseData = z.infer<typeof authResponseDataSchema>;


