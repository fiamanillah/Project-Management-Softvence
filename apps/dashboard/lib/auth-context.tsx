"use client";

import * as React from "react";
import { api, setAccessToken, onAuthFailure, onForbidden } from "./api";
import { PermissionProvider, type PermissionMap } from "./permissions/PermissionContext";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  status?: "INVITED" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED" | "ARCHIVED";
  isActive?: boolean;
  designationId?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  permissions: PermissionMap;
  token: string | null;
  isLoading: boolean;
  can: (permissionCode: string) => boolean;
  login: (email: string, password: string) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function normalizePermissionMap(raw: any): PermissionMap {
  if (!raw || typeof raw !== "object") return {};
  const normalized: PermissionMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") {
      normalized[key] = value;
    } else if (value && typeof value === "object" && "allowed" in value) {
      normalized[key] = Boolean((value as any).allowed);
    } else {
      normalized[key] = Boolean(value);
    }
  }
  return normalized;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [permissions, setPermissions] = React.useState<PermissionMap>({});
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const fetchPermissions = React.useCallback(async () => {
    try {
      const res = await api.get<{ permissions: any }>("/auth/permissions");
      if (res && res.permissions) {
        const normalized = normalizePermissionMap(res.permissions);
        setPermissions(normalized);
      }
    } catch (err) {
      console.warn("Failed to fetch permissions map:", err);
    }
  }, []);

  // Passive 403 Cache Freshness: silently refetch permissions on 403 Forbidden
  React.useEffect(() => {
    const unsubscribeForbidden = onForbidden(() => {
      fetchPermissions();
    });
    return unsubscribeForbidden;
  }, [fetchPermissions]);

  // Handle auth failure event triggered by 401 interceptor
  React.useEffect(() => {
    const unsubscribeAuth = onAuthFailure(() => {
      setAccessToken(null);
      setToken(null);
      setUser(null);
      setPermissions({});
      localStorage.removeItem("user");
    });
    return unsubscribeAuth;
  }, []);

  // Initialize auth: perform silent refresh via HttpOnly cookie on app mount
  React.useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // Attempt silent refresh using HttpOnly refresh cookie
        const res = await api.post<{ accessToken: string; user: User }>("/auth/refresh");
        if (isMounted && res.accessToken && res.user) {
          setAccessToken(res.accessToken);
          setToken(res.accessToken);
          setUser(res.user);
          localStorage.setItem("user", JSON.stringify(res.user));
          await fetchPermissions();
        }
      } catch {
        // Refresh cookie missing or expired
        if (isMounted) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
          localStorage.removeItem("user");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchPermissions]);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await api.post<{ accessToken: string; user: User }>("/auth/login", {
      email,
      password,
    });

    if (data.accessToken && data.user) {
      setAccessToken(data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);

      // Hydrate permission map
      await fetchPermissions();
      return data.user;
    }

    throw new Error("Invalid response from server");
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const data = await api.post<{ accessToken: string; user: User }>("/auth/change-password", {
      currentPassword,
      newPassword,
    });

    if (data.accessToken && data.user) {
      setAccessToken(data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);

      await fetchPermissions();
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    } finally {
      setAccessToken(null);
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setPermissions({});
    }
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  const updateUser = React.useCallback((updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedData };
      try {
        localStorage.setItem("user", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await api.get<User>("/users/me");
      if (res && res.id) {
        setUser(res);
        try {
          localStorage.setItem("user", JSON.stringify(res));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn("Failed to refresh user profile:", err);
    }
  }, []);

  const can = (permissionCode: string): boolean => {
    if (user?.systemRole === "SuperAdmin") return true;
    return permissions[permissionCode] === true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        token,
        isLoading,
        can,
        login,
        changePassword,
        logout,
        refreshPermissions,
        updateUser,
        refreshUser,
      }}
    >
      <PermissionProvider permissions={permissions}>
        {children}
      </PermissionProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
