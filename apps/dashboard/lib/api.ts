// apps/dashboard/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";

export interface ApiResponse<T = any> {
  status: string;
  message: string;
  data?: T;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function extractErrorMessage(body: any, fallback = "An unexpected network or server error occurred"): string {
  if (!body) return fallback;
  if (typeof body === "string") return body;

  if (body.error) {
    if (typeof body.error === "string") return body.error;
    if (typeof body.error === "object") {
      if (typeof body.error.message === "string" && body.error.message.trim()) {
        return body.error.message;
      }
      if (Array.isArray(body.error.details) && body.error.details.length > 0) {
        return body.error.details
          .map((d: any) => (typeof d === "string" ? d : d.message || JSON.stringify(d)))
          .join(", ");
      }
      if (typeof body.error.details === "string") {
        return body.error.details;
      }
    }
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors
      .map((e: any) => (typeof e === "string" ? e : e.message || JSON.stringify(e)))
      .join(", ");
  }

  if (body.data && typeof body.data === "object") {
    if (typeof body.data.message === "string") return body.data.message;
    if (typeof body.data.error === "string") return body.data.error;
  }

  return fallback;
}

export function getErrorMessage(err: unknown, fallback = "An unexpected error occurred"): string {
  if (!err) return fallback;
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    return extractErrorMessage(err, fallback);
  }
  if (typeof err === "string") return err;
  return fallback;
}

// In-Memory Access Token Storage (Security best practice: avoid localStorage for JWTs)
let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

// Auth Failure Listeners (e.g. AuthProvider subscribes to clean state & redirect to /login)
type AuthFailureCallback = () => void;
const authFailureListeners: Set<AuthFailureCallback> = new Set();

export function onAuthFailure(callback: AuthFailureCallback) {
  authFailureListeners.add(callback);
  return () => {
    authFailureListeners.delete(callback);
  };
}

function notifyAuthFailure() {
  authFailureListeners.forEach((cb) => cb());
}

// Forbidden (403) Listeners (e.g. AuthProvider/PermissionContext silently refetches fresh permission map)
type ForbiddenCallback = () => void;
const forbiddenListeners: Set<ForbiddenCallback> = new Set();

export function onForbidden(callback: ForbiddenCallback) {
  forbiddenListeners.add(callback);
  return () => {
    forbiddenListeners.delete(callback);
  };
}

function notifyForbidden() {
  forbiddenListeners.forEach((cb) => cb());
}

// Interceptor Queue for Concurrent 401 Requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  endpoint: string;
  options: RequestInit;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      const updatedHeaders: Record<string, string> = {
        ...(prom.options.headers as Record<string, string>),
      };
      if (token) {
        updatedHeaders["Authorization"] = `Bearer ${token}`;
      }
      apiRequest(prom.endpoint, { ...prom.options, headers: updatedHeaders })
        .then(prom.resolve)
        .catch(prom.reject);
    }
  });
  failedQueue = [];
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      ...headers,
    },
    credentials: "include", // send HttpOnly cookies for refresh token
  });

  const body = await response.json().catch(() => ({}));

  // Handle 401 Unauthorized with Automatic Token Refresh (Skip for login/refresh/logout routes)
  const isAuthEndpoint =
    endpoint.includes("/auth/login") ||
    endpoint.includes("/auth/refresh") ||
    endpoint.includes("/auth/logout");

  if (response.status === 401 && !isAuthEndpoint) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({ resolve, reject, endpoint, options });
      });
    }

    isRefreshing = true;

    try {
      const refreshUrl = `${API_BASE_URL}/auth/refresh`;
      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const refreshBody = await refreshRes.json().catch(() => ({}));

      if (!refreshRes.ok || !refreshBody.data?.accessToken) {
        throw new Error(extractErrorMessage(refreshBody, "Refresh token expired or invalid"));
      }

      const newAccessToken = refreshBody.data.accessToken;
      setAccessToken(newAccessToken);

      // Process pending queue
      processQueue(null, newAccessToken);

      // Retry original request with new token
      headers["Authorization"] = `Bearer ${newAccessToken}`;
      const retryRes = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      const retryBody = await retryRes.json().catch(() => ({}));

      if (!retryRes.ok) {
        if (retryRes.status === 403) {
          notifyForbidden();
        }
        throw new ApiError(
          retryRes.status,
          extractErrorMessage(retryBody, "An unexpected network or server error occurred"),
          retryBody,
        );
      }

      return extractResponseData<T>(retryBody);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      setAccessToken(null);
      notifyAuthFailure();
      throw new ApiError(401, "Session expired. Please log in again.", body);
    } finally {
      isRefreshing = false;
    }
  }

  if (!response.ok) {
    if (response.status === 403) {
      notifyForbidden();
    }
    throw new ApiError(
      response.status,
      extractErrorMessage(body, "An unexpected network or server error occurred"),
      body,
    );
  }

  return extractResponseData<T>(body);
}

function extractResponseData<T>(body: any): T {
  if (body.data !== undefined) {
    if (typeof body.data === "object" && body.data !== null && body.meta !== undefined) {
      try {
        Object.defineProperty(body.data, "meta", {
          value: body.meta,
          writable: true,
          enumerable: false,
          configurable: true,
        });
      } catch {
        // ignore if non-extensible
      }
    }
    return body.data;
  }
  return body;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "GET", ...options }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "DELETE", ...options }),
};

