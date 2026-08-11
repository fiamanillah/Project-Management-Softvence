import {
  createUserBodySchema,
  loginUserBodySchema,
  type CreateUserDTO,
  type LoginUserDTO,
  type UserWithoutPassword,
  type ApiResponse,
} from "@workspace/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function registerUser(input: CreateUserDTO): Promise<ApiResponse<UserWithoutPassword>> {
  // Validate input schema on client side before network request
  const validatedInput = createUserBodySchema.parse(input);

  const response = await fetch(`${API_BASE_URL}/auth/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedInput),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return data as ApiResponse<UserWithoutPassword>;
}

export async function loginUser(input: LoginUserDTO): Promise<ApiResponse<{ token: string; user: UserWithoutPassword }>> {
  // Validate input schema on client side before network request
  const validatedInput = loginUserBodySchema.parse(input);

  const response = await fetch(`${API_BASE_URL}/auth/v1/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedInput),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data as ApiResponse<{ token: string; user: UserWithoutPassword }>;
}
